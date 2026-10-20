"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useContent } from "../ContentProvider";

const tags = ["Websites", "Online stores", "Reels", "Ad films", "Brand design"];

// Scroll story: the reel first plays inside giant letters, then the letters zoom past
// and the full video settles into a framed player.
export default function Showreel() {
  const { content } = useContent();
  // Nothing to show without a video.
  if (!content.showreel.video?.trim()) return null;
  return <ShowreelInner />;
}

function ShowreelInner() {
  const { content } = useContent();
  const ref = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const maskScale = useTransform(p, [0, 0.5], [1, 8]);
  const maskOpacity = useTransform(p, [0.3, 0.5], [1, 0]);
  const kickerOpacity = useTransform(p, [0, 0.15], [1, 0]);
  const videoScale = useTransform(p, [0.5, 0.85], [1, 0.86]);
  const radius = useTransform(p, [0.5, 0.85], [0, 32]);
  const captionOpacity = useTransform(p, [0.7, 0.88], [0, 1]);
  const captionY = useTransform(p, [0.7, 0.88], [24, 0]);
  const captionPointer = useTransform(p, (v) => (v > 0.72 ? "auto" : "none"));

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <section ref={ref} className="relative h-[220vh] bg-ink text-white" aria-label={content.showreel.title}>
      <div className="sticky top-0 isolate h-[100svh] overflow-hidden">
        <motion.div style={{ scale: videoScale, borderRadius: radius }} className="absolute inset-0 overflow-hidden bg-ink-3">
          <video ref={video} src={content.showreel.video} poster={content.showreel.poster} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/30" />
        </motion.div>

        {/* Dark layer with the word cut out: multiply blend lets the video show only through the letters */}
        <motion.div aria-hidden style={{ scale: maskScale, opacity: maskOpacity }} className="pointer-events-none absolute inset-0 grid place-items-center bg-ink mix-blend-multiply [will-change:transform,opacity]">
          <span className="select-none font-display text-[19vw] font-bold leading-none tracking-tightest text-white">Showreel</span>
        </motion.div>

        <motion.p style={{ opacity: kickerOpacity }} className="absolute inset-x-0 top-[18%] text-center text-lg text-white/70">
          {content.showreel.title}
        </motion.p>
        <motion.p style={{ opacity: kickerOpacity }} className="absolute inset-x-0 bottom-[12%] text-center text-sm text-white/55">
          Keep scrolling
        </motion.p>

        {/* Caption and controls once the video is framed */}
        <motion.div style={{ opacity: captionOpacity, y: captionY, pointerEvents: captionPointer }} className="absolute inset-x-0 bottom-[10%] px-[10%]">
          <div className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="h-display text-3xl sm:text-5xl">{content.showreel.title}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="rounded-full border border-white/25 bg-ink/40 px-3 py-1 text-sm backdrop-blur">{t}</span>
                ))}
              </div>
            </div>
            <button onClick={toggle} aria-label={playing ? "Pause video" : "Play video"} className="flex h-12 shrink-0 items-center gap-3 rounded-full bg-white py-1 pl-1 pr-5 text-sm font-semibold text-ink transition hover:bg-lav-100">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white">{playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}</span>
              {playing ? "Pause reel" : "Play reel"}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
