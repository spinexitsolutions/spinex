"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, Clock, Eye, Loader2, Lock, Maximize, Minimize, Pause, Play, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";

type State = "active" | "expired" | "used" | "revoked" | "notready" | "removed";
type Props = {
  token: string; brand: string; logo: string; whatsapp: string; title: string; client: string; phone: string; showName: boolean;
  needsPin: boolean; expiresAt: string; viewsLeft: number | null; portrait: boolean; state: State;
};

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60), x = Math.floor(s % 60);
  return `${m}:${String(x).padStart(2, "0")}`;
};
const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "");
const nowLabel = () => new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

const CLOSED: Record<Exclude<State, "active">, { title: string; text: string }> = {
  expired: { title: "This demo link has expired", text: "Demo links work for a few days only. Message us and we'll send you a fresh one." },
  used: { title: "All views of this link are used", text: "This link could be played only a few times. Message us and we'll send you a fresh one." },
  revoked: { title: "This demo link is turned off", text: "Message us if you'd like to see the demo again." },
  removed: { title: "This demo has been removed", text: "Message us and we'll share our latest work with you." },
  notready: { title: "This demo is almost ready", text: "We're still preparing the video. Please open the link again in a few minutes." },
};

// The client's private demo page. The video is never offered as a download: no download button, no right-click,
// no picture-in-picture, and it pauses and hides when the page loses focus. The Spinex watermark is printed into
// the video itself, and the client's own name and number move over it, so a phone recording still shows who it was.
export default function DemoPlayer(p: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>(p.state);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState<number | null>(p.viewsLeft);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pos, setPos] = useState({ x: 8, y: 70 });
  const [stamp, setStamp] = useState("");
  const [ui, setUi] = useState(true);
  const uiTimer = useRef<ReturnType<typeof setTimeout>>();
  const first = p.client.split(" ")[0] || p.client;

  const start = useCallback(async (silent = false) => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/demo/${p.token}/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }), cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) setErr(d.error || "Couldn't start the video. Try again.");
        return false;
      }
      setLeft(typeof d.viewsLeft === "number" ? d.viewsLeft : null);
      setUnlocked(true);
      setState("active");
      return true;
    } catch {
      if (!silent) setErr("No internet connection. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [p.token, pin]);

  // Someone who was already watching (pass still valid) can keep watching after the last view was used.
  useEffect(() => {
    if (p.state === "used" || p.state === "expired") void start(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (unlocked) vid.current?.play().catch(() => undefined);
  }, [unlocked]);

  // Pause and cover the video when the client leaves the tab or window (screen tools usually take focus).
  useEffect(() => {
    const away = () => {
      vid.current?.pause();
      setHidden(true);
    };
    const vis = () => { if (document.visibilityState !== "visible") away(); };
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "printscreen") {
        away();
        navigator.clipboard?.writeText("").catch(() => undefined);
      }
      if ((e.ctrlKey || e.metaKey) && (k === "s" || k === "p" || k === "u")) e.preventDefault();
      if (k === " " && unlocked && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", away);
    window.addEventListener("keydown", keys);
    window.addEventListener("keyup", keys);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", away);
      window.removeEventListener("keydown", keys);
      window.removeEventListener("keyup", keys);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  // The client's name moves to a new place every few seconds, so it can't be cropped out of a recording.
  useEffect(() => {
    setStamp(nowLabel());
    const id = setInterval(() => {
      setPos({ x: 4 + Math.random() * 56, y: 10 + Math.random() * 72 });
      setStamp(nowLabel());
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const f = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    setHidden(false);
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };
  const fullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => setFull((x) => !x));
    else setFull((x) => !x); // iPhone: fill the screen inside the page instead
  };
  const poke = () => {
    setUi(true);
    clearTimeout(uiTimer.current);
    uiTimer.current = setTimeout(() => setUi(false), 2600);
  };
  const block = (e: React.SyntheticEvent) => e.preventDefault();
  const wa = p.whatsapp ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${p.brand.split(" ")[0]}, I watched the demo "${p.title}". I'd like to talk about my project.`)}` : "";

  return (
    <main className="min-h-screen select-none bg-ink px-4 pb-16 pt-6 text-white sm:pt-8" onContextMenu={block}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {p.logo ? <img src={p.logo} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-1" draggable={false} /> : null}
          <span className="font-display text-lg font-semibold tracking-tight">{p.brand}</span>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12.5px] text-white/75 sm:inline-flex"><Lock size={13} /> Private demo for {first}</span>
      </div>

      <div className="mx-auto mt-10 max-w-5xl">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-lav-300">Sample edit</p>
        <h1 className="h-display mt-3 text-[34px] sm:text-5xl">{p.title}</h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-white/65">Made for {p.client}. This video is private, please don&apos;t share the link.</p>
      </div>

      {state !== "active" && !unlocked ? (
        <div className="mx-auto mt-8 max-w-5xl rounded-[22px] border border-white/10 bg-white/[0.04] px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-lav-200">{state === "notready" ? <Clock size={22} /> : <Ban size={22} />}</span>
          <h2 className="mt-5 font-display text-2xl font-semibold">{CLOSED[state].title}</h2>
          <p className="mx-auto mt-2 max-w-md text-white/65">{CLOSED[state].text}</p>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-light mt-7 inline-flex"><WhatsAppIcon size={17} /> Message us on WhatsApp</a>}
        </div>
      ) : (
        <>
          <div
            ref={wrap}
            onMouseMove={poke}
            onTouchStart={poke}
            className={`${full ? "fixed inset-0 z-50 grid place-items-center rounded-none bg-black" : `relative mx-auto mt-8 rounded-[22px] ${p.portrait ? "max-w-[min(100%,calc(78vh*9/16))]" : "max-w-[min(64rem,calc(80vh*16/9))]"}`} overflow-hidden bg-black shadow-[0_30px_90px_-25px_rgba(110,89,217,0.55)]`}
          >
            <div className={`relative w-full ${full ? "h-full" : p.portrait ? "aspect-[9/16]" : "aspect-video"}`}>
              {unlocked && (
                <video
                  ref={vid}
                  src={`/api/demo/${p.token}/video`}
                  className="absolute inset-0 h-full w-full object-contain"
                  playsInline
                  preload="metadata"
                  controls={false}
                  disablePictureInPicture
                  {...{ controlsList: "nodownload noplaybackrate noremoteplayback nofullscreen", "x-webkit-airplay": "deny" }}
                  draggable={false}
                  onContextMenu={block}
                  onDragStart={block}
                  onClick={toggle}
                  onPlay={() => { setPlaying(true); setHidden(false); poke(); }}
                  onPause={() => { setPlaying(false); setUi(true); }}
                  onWaiting={() => setWaiting(true)}
                  onPlaying={() => setWaiting(false)}
                  onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
                  onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                />
              )}

              {/* Watermarks (on top of the one printed into the video) */}
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -inset-1/2 grid rotate-[-24deg] grid-cols-4 content-center gap-x-10 gap-y-20">
                  {Array.from({ length: 24 }, (_, i) => <span key={i} className="whitespace-nowrap font-display text-lg font-semibold tracking-[0.3em] text-white/[0.06] sm:text-2xl">{p.brand.split(" ")[0].toUpperCase()}</span>)}
                </div>
                {p.showName && (
                  <span className="absolute whitespace-nowrap rounded-md bg-black/20 px-2 py-1 text-[11.5px] font-semibold text-white/55 transition-all duration-[2000ms] ease-in-out sm:text-[12.5px]" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                    {p.client}{p.phone ? ` · ${p.phone}` : ""} · {stamp}
                  </span>
                )}
              </div>

              {!unlocked && (
                <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_25%,rgba(110,89,217,0.45),transparent_60%)] px-6 text-center">
                  <div className="w-full max-w-xs">
                    <button type="button" onClick={() => void start()} disabled={busy || (p.needsPin && pin.length < 4)} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-ink shadow-xl transition hover:scale-105 disabled:opacity-60" aria-label="Play">
                      {busy ? <Loader2 className="animate-spin" /> : <Play size={30} className="ml-1" fill="currentColor" />}
                    </button>
                    {p.needsPin && (
                      <form onSubmit={(e) => { e.preventDefault(); void start(); }} className="mt-6">
                        <label className="text-sm text-white/75" htmlFor="pin">Type the PIN we sent you</label>
                        <input id="pin" inputMode="numeric" autoComplete="one-time-code" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none focus:border-white/60" placeholder="••••" />
                      </form>
                    )}
                    {!p.needsPin && <p className="mt-5 text-sm text-white/70">Press play to watch</p>}
                    {err && <p className="mt-3 text-sm font-semibold text-rose-300">{err}</p>}
                  </div>
                </div>
              )}

              {unlocked && waiting && playing && <div className="pointer-events-none absolute inset-0 grid place-items-center"><Loader2 className="animate-spin text-white/80" size={34} /></div>}

              {unlocked && !playing && !hidden && (
                <button type="button" onClick={toggle} className="absolute inset-0 grid place-items-center" aria-label="Play">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink shadow-xl"><Play size={26} className="ml-1" fill="currentColor" /></span>
                </button>
              )}

              {hidden && unlocked && (
                <button type="button" onClick={toggle} className="absolute inset-0 grid place-items-center bg-ink/[0.97] px-6 text-center">
                  <span>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-lav-200"><ShieldCheck size={22} /></span>
                    <span className="mt-4 block font-display text-xl font-semibold">Video paused</span>
                    <span className="mt-1 block text-sm text-white/65">Tap here to keep watching.</span>
                  </span>
                </button>
              )}

              {unlocked && (
                <div className={`absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3.5 pt-10 transition-opacity duration-300 ${ui || !playing ? "opacity-100" : "opacity-0"}`}>
                  <button type="button" onClick={toggle} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink" aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={dur || 0}
                    step={0.1}
                    value={Math.min(t, dur || 0)}
                    onChange={(e) => { if (vid.current) vid.current.currentTime = Number(e.target.value); }}
                    className="h-1 flex-1 cursor-pointer accent-lav-400"
                    aria-label="Seek"
                  />
                  <span className="shrink-0 text-xs tabular-nums text-white/85">{fmt(t)} / {fmt(dur)}</span>
                  <button type="button" onClick={() => { if (vid.current) vid.current.muted = !vid.current.muted; }} className="shrink-0 text-white/90" aria-label={muted ? "Sound on" : "Mute"}>
                    {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                  </button>
                  <button type="button" onClick={fullscreen} className="shrink-0 text-white/90" aria-label={full ? "Exit full screen" : "Full screen"}>
                    {full ? <Minimize size={19} /> : <Maximize size={19} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <dl className="mx-auto mt-5 grid max-w-5xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5"><dt className="flex items-center gap-1.5 text-[12.5px] text-white/50"><Clock size={13} /> Link works till</dt><dd className="mt-1 font-semibold">{day(p.expiresAt)}</dd></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5"><dt className="flex items-center gap-1.5 text-[12.5px] text-white/50"><Eye size={13} /> Views left</dt><dd className="mt-1 font-semibold">{left === null ? "No limit" : unlocked ? `${left} after this one` : left}</dd></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5"><dt className="flex items-center gap-1.5 text-[12.5px] text-white/50"><ShieldCheck size={13} /> Download</dt><dd className="mt-1 font-semibold">Not available for demos</dd></div>
          </dl>

          {wa && (
            <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-[22px] border border-lav-400/30 bg-gradient-to-r from-lav-600/25 to-lav-600/5 px-6 py-5">
              <div>
                <p className="font-display text-xl font-semibold">Like this style? Let&apos;s make yours.</p>
                <p className="mt-1 text-sm text-white/65">Tell us about your brand and we&apos;ll plan your videos.</p>
              </div>
              <a href={wa} target="_blank" rel="noreferrer" className="btn-light"><WhatsAppIcon size={17} /> Chat on WhatsApp</a>
            </div>
          )}
        </>
      )}
    </main>
  );
}
