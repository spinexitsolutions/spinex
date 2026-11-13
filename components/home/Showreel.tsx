"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useContent } from "../ContentProvider";
import { SplitHeading, ease } from "../Reveal";

// Brand video: heading on top and the video in a glowing frame below. It scrolls like any other
// section. The video plays muted while on screen; "Watch with sound" restarts it with sound.
export default function Showreel() {
  const { content } = useContent();
  if (!content.showreel.video?.trim()) return null;
  return <ShowreelInner />;
}

function ShowreelInner() {
  const { content } = useContent();
  const sr = content.showreel;
  const ref = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [phone, setPhone] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);

  // Start downloading only when the visitor is about a screen away, to save mobile data.
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  // Phones get the portrait 9:16 video when one is set.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const pick = () => setPhone(mq.matches);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, []);

  // Plays only while on screen.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().then(() => setPlaying(true)).catch(() => {});
      else { v.pause(); setPlaying(false); }
    }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [near, phone]);

  const usePhone = phone === true && !!sr.videoMobile?.trim();
  const src = phone === null || !near ? undefined : usePhone ? sr.videoMobile : sr.video;
  const poster = usePhone ? sr.posterMobile || sr.poster : sr.poster;
  const eyebrow = sr.eyebrow ?? "Our story in 30 seconds";
  const title = sr.title?.trim() || "One team. *Everything online.*";

  const withSound = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    setSound(true);
    v.play().then(() => setPlaying(true)).catch(() => {});
  };
  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  };
  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setSound(!v.muted);
  };

  return (
    <section ref={ref} className="relative overflow-hidden bg-ink py-16 text-center text-white sm:py-28" aria-label={title.replace(/\*/g, "")} data-showreel-section>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[58%] h-[700px] w-[1100px] max-w-[160vw] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(110,89,217,0.45),transparent)]" />
      <div className="container-x relative">
        {eyebrow && <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-lav-300 sm:text-[13px]">{eyebrow}</p>}
        <SplitHeading text={title} className="h-display mx-auto mt-3 max-w-4xl text-4xl sm:mt-4 sm:text-6xl" />
        {sr.intro && <p className="mx-auto mt-3 max-w-xl text-[15px] text-white/60 sm:mt-4 sm:text-lg">{sr.intro}</p>}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px 0px" }}
          transition={{ duration: 0.8, ease }}
          className={`relative mx-auto mt-8 rounded-[30px] bg-gradient-to-br from-[#b9acf5]/60 via-white/[0.06] to-[#f0abfc]/45 p-[7px] shadow-[0_60px_120px_-40px_rgba(110,89,217,0.6)] sm:mt-14 sm:rounded-[34px] sm:p-[10px] ${usePhone ? "w-[min(300px,82vw)]" : "max-w-[1040px]"}`}
        >
          <div className={`relative overflow-hidden rounded-[24px] bg-[#f7f6fb] sm:rounded-[26px] ${usePhone ? "aspect-[9/16]" : "aspect-video"}`}>
            <video
              ref={video}
              key={src ?? "none"}
              src={src}
              poster={poster}
              muted={!sound}
              loop
              playsInline
              preload={src ? "auto" : "none"}
              className="absolute inset-0 h-full w-full object-cover"
              data-showreel={usePhone ? "phone" : "wide"}
            />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 sm:inset-x-5 sm:bottom-5">
              {!sound ? (
                <button type="button" onClick={withSound} className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4 text-[13px] font-semibold text-ink shadow-lg transition hover:bg-lav-100 sm:text-sm">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white sm:h-10 sm:w-10"><Play size={15} className="ml-0.5" /></span>
                  Watch with sound
                </button>
              ) : <span />}
              <span className="flex gap-2">
                <button type="button" onClick={toggleSound} aria-label={sound ? "Mute" : "Turn sound on"} className="grid h-9 w-9 place-items-center rounded-full bg-ink/75 text-white backdrop-blur transition hover:bg-ink sm:h-11 sm:w-11">
                  {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                </button>
                <button type="button" onClick={togglePlay} aria-label={playing ? "Pause video" : "Play video"} className="grid h-9 w-9 place-items-center rounded-full bg-ink/75 text-white backdrop-blur transition hover:bg-ink sm:h-11 sm:w-11">
                  {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
