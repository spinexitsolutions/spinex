"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, MessageCircle, Play, Send } from "lucide-react";
import type { Project } from "@/lib/content";
import { projectDisplay } from "@/lib/project-display";
import { ease } from "../Reveal";

// Picks the right frame for a project: websites in a laptop, social media as an
// Instagram profile, videos in a player, ads with results, design as a collage,
// e-commerce management as a seller dashboard, on-demand apps as three screens.
export default function ProjectStage({ project, open, play }: { project: Project; open: boolean; play: boolean }) {
  const display = projectDisplay(project);

  if (display === "website") {
    return (
      <div className="relative mx-auto max-w-[760px] pb-[4%] [perspective:1800px]">
        <Laptop project={project} open={open} play={play} />
        <div className="absolute -right-[2%] bottom-0 hidden w-[21%] sm:block">
          <Phone project={project} show={open} play={play} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto aspect-[16/11] w-full max-w-[760px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={project.id}
          initial={{ opacity: 0, y: 24 }}
          animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.6, ease }}
          className="absolute inset-0"
        >
          {display === "social" && <SocialFrame project={project} play={play} />}
          {display === "video" && <VideoFrame project={project} play={play} />}
          {display === "ads" && <AdsFrame project={project} />}
          {display === "design" && <DesignFrame project={project} />}
          {display === "ecommerce" && <EcommerceFrame project={project} play={play} />}
          {display === "ondemand" && <OnDemandFrame project={project} play={play} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- helpers ---------- */

const pics = (p: Project) => {
  const list = (p.images ?? []).filter(Boolean);
  return list.length ? list : p.image ? [p.image] : [];
};
const results = (p: Project) => (p.results ?? []).map((r) => r.trim()).filter(Boolean);

function splitResult(text: string) {
  const i = text.indexOf(":");
  return i > 0 ? { label: text.slice(0, i).trim(), value: text.slice(i + 1).trim() } : { label: "", value: text };
}

function ResultValue({ value }: { value: string }) {
  const parts = value.split(/\s*(?:→|->)\s*/);
  if (parts.length < 2) return <>{value}</>;
  return (
    <>
      {parts[0]} <span className="opacity-45">→</span> {parts.slice(1).join(" → ")}
    </>
  );
}

function ResultCard({ text, dark = false, className = "" }: { text: string; dark?: boolean; className?: string }) {
  const { label, value } = splitResult(text);
  return (
    <div className={`rounded-[clamp(10px,1.6vw,18px)] px-[clamp(10px,1.6vw,18px)] py-[clamp(8px,1.3vw,14px)] shadow-[0_24px_50px_-26px_rgba(18,15,27,0.45)] ${dark ? "bg-ink text-white" : "border border-line bg-white"} ${className}`}>
      {label && <p className={`text-[clamp(9px,1vw,12px)] ${dark ? "text-lav-300" : "text-muted"}`}>{label}</p>}
      <p className={`font-display text-[clamp(14px,2.3vw,28px)] font-bold leading-tight ${!dark ? "text-ink" : ""}`}><ResultValue value={value} /></p>
    </div>
  );
}

const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1] ?? "";

// YouTube or .mp4, muted and looping while the section is on screen.
function VideoMedia({ url, poster, play, className = "" }: { url: string; poster: string; play: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const yt = youtubeId(url);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (play) v.play().catch(() => {});
    else v.pause();
  }, [play]);

  if (yt) {
    return play ? (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&modestbranding=1&playsinline=1&rel=0`}
        title="Project video"
        allow="autoplay; encrypted-media; picture-in-picture"
        className={`pointer-events-none h-full w-full ${className}`}
      />
    ) : (
      <Poster src={poster || `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} className={className} />
    );
  }
  return <video ref={ref} src={url} poster={poster || undefined} muted loop playsInline preload="metadata" className={`h-full w-full object-cover ${className}`} />;
}

function Poster({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`relative h-full w-full bg-ink ${className}`}>
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-[18%] min-h-9 w-auto min-w-9 place-items-center rounded-full bg-white/90 text-ink" style={{ aspectRatio: "1" }}><Play size={18} className="ml-0.5" /></span>
      </span>
    </div>
  );
}

// A tall screenshot that scrolls slowly from top to bottom inside its frame.
function ScrollShot({ src, alt = "", play, frameRatio }: { src: string; alt?: string; play: boolean; frameRatio: number }) {
  const reduced = useReducedMotion();
  const img = useRef<HTMLImageElement>(null);
  const [ratio, setRatio] = useState(0);
  const measure = () => {
    const el = img.current;
    if (el && el.naturalWidth) setRatio(el.naturalHeight / el.naturalWidth);
  };
  useEffect(() => {
    if (img.current?.complete) measure();
  }, [src]);
  const travel = ratio > frameRatio ? (1 - frameRatio / ratio) * 100 : 0;
  const moving = play && !reduced && travel > 0;
  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <motion.img
        ref={img}
        src={src}
        alt={alt}
        onLoad={measure}
        className="block w-full"
        animate={moving ? { y: ["0%", "0%", `-${travel}%`, `-${travel}%`] } : { y: "0%" }}
        transition={moving ? { duration: Math.min(28, 6 + travel / 5), times: [0, 0.1, 0.9, 1], repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } : { duration: 0.4 }}
      />
    </div>
  );
}

function PhoneShell({ children, dark = false, className = "", style }: { children: React.ReactNode; dark?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`absolute aspect-[9/19] overflow-hidden rounded-[18%/8.5%] border-[clamp(3px,0.6vw,6px)] border-[#17141f] shadow-[0_34px_60px_-24px_rgba(18,15,27,0.6)] ${dark ? "bg-ink" : "bg-white"} ${className}`}>
      <span aria-hidden className="absolute left-1/2 top-[1.8%] z-20 h-[3%] w-[34%] -translate-x-1/2 rounded-full bg-[#17141f]" />
      {children}
    </div>
  );
}

const Bar = ({ w = "100%", className = "" }: { w?: string; className?: string }) => <span className={`block h-[clamp(4px,0.7vw,8px)] rounded-full bg-line ${className}`} style={{ width: w }} />;

/* ---------- website ---------- */

function Laptop({ project, open, play }: { project: Project; open: boolean; play: boolean }) {
  return (
    <div>
      {/* Lid opens when the section first comes into view */}
      <motion.div
        initial={{ rotateX: -70, opacity: 0 }}
        animate={open ? { rotateX: 0, opacity: 1 } : undefined}
        transition={{ duration: 1.3, ease }}
        style={{ transformOrigin: "bottom center" }}
        className="relative mx-[6%] rounded-t-[18px] border border-[#2c2836] bg-[#17141f] p-[1.6%] pb-[2.4%] shadow-[0_40px_80px_-30px_rgb(var(--c-lav-700)/0.45)]"
      >
        <span aria-hidden className="absolute left-1/2 top-[0.6%] z-10 h-[2.4%] w-[12%] -translate-x-1/2 rounded-b-md bg-[#17141f]" />
        <div className="relative aspect-[16/10] overflow-hidden rounded-[6px] bg-white">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={project.id} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }} className="absolute inset-0">
              {project.video ? (
                <VideoMedia url={project.video} poster={project.image} play={play} />
              ) : project.screen ? (
                <ScrollShot src={project.screen} alt={project.title} play={play} frameRatio={10 / 16} />
              ) : (
                <SiteScreen project={project} play={play} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      {/* Base */}
      <div aria-hidden className="relative h-[14px] rounded-b-[14px] rounded-t-[3px] bg-gradient-to-b from-[#d9d5e3] to-[#a8a3b5] sm:h-[18px]">
        <span className="absolute left-1/2 top-0 h-[40%] w-[14%] -translate-x-1/2 rounded-b-lg bg-[#bdb8c9]" />
      </div>
    </div>
  );
}

// A small website built from the project's image and text; it scrolls slowly like someone browsing.
function SiteScreen({ project, play }: { project: Project; play: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="h-full overflow-hidden">
      <motion.div
        className="h-[230%]"
        animate={reduced || !play ? { y: "0%" } : { y: ["0%", "0%", "-56%", "-56%"] }}
        transition={play && !reduced ? { duration: 11, times: [0, 0.12, 0.85, 1], repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } : { duration: 0.4 }}
      >
        <div className="flex h-[5%] items-center justify-between border-b border-line px-[4%]">
          <span className="truncate text-[clamp(7px,1.1vw,12px)] font-bold">{project.title.split(" ").slice(0, 2).join(" ")}</span>
          <span className="flex gap-[6px]">{[0, 1, 2].map((i) => <span key={i} className="h-[5px] w-[22px] rounded bg-line" />)}</span>
        </div>
        <div className="relative h-[34%] overflow-hidden bg-ink">
          {project.image && <img src={project.image} alt={project.title} className="h-full w-full object-cover opacity-70" />}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 to-transparent" />
          <div className="absolute left-[5%] top-1/2 w-[60%] -translate-y-1/2 text-white">
            <p className="font-display text-[clamp(11px,2.3vw,26px)] font-semibold leading-tight">{project.title}</p>
            <p className="mt-1 text-[clamp(7px,1vw,12px)] text-white/75">{project.summary}</p>
            <span className="mt-2 inline-block rounded-full bg-lav-400 px-[8%] py-[2%] text-[clamp(6px,0.9vw,11px)] font-semibold text-ink">Learn more</span>
          </div>
        </div>
        <div className="grid h-[22%] grid-cols-3 gap-[3%] p-[4%]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-[8%] rounded-lg border border-line p-[6%]">
              <div className="flex-1 rounded-md bg-lav-100" />
              <div className="h-[8%] w-4/5 rounded bg-line" />
              <div className="h-[8%] w-1/2 rounded bg-line" />
            </div>
          ))}
        </div>
        <div className="grid h-[24%] grid-cols-2 gap-[4%] px-[4%] pb-[4%]">
          <div className="overflow-hidden rounded-lg bg-mist">{project.image && <img src={project.image} alt="" className="h-full w-full object-cover" />}</div>
          <div className="flex flex-col justify-center gap-[8%]">
            <div className="h-[8%] w-4/5 rounded bg-ink" />
            <div className="h-[6%] w-full rounded bg-line" />
            <div className="h-[6%] w-11/12 rounded bg-line" />
            <div className="h-[6%] w-3/5 rounded bg-line" />
          </div>
        </div>
        <div className="h-[15%] bg-ink" />
      </motion.div>
    </div>
  );
}

function Phone({ project, show, play }: { project: Project; show: boolean; play: boolean }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={show ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 0.9, delay: 0.8, ease }}
      className="relative aspect-[9/19] overflow-hidden rounded-[22%/10%] border-[5px] border-[#17141f] bg-white shadow-[0_30px_60px_-20px_rgba(18,15,27,0.55)]"
    >
      <span aria-hidden className="absolute left-1/2 top-[2%] z-10 h-[3%] w-[34%] -translate-x-1/2 rounded-full bg-[#17141f]" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, delay: 0.1, ease }} className="absolute inset-0 flex flex-col">
          {project.mobile ? (
            <ScrollShot src={project.mobile} alt="" play={play} frameRatio={19 / 9} />
          ) : (
            <>
              <div className="relative h-[46%] bg-ink">
                {project.image && <img src={project.image} alt="" className="h-full w-full object-cover opacity-75" />}
                <p className="absolute bottom-[8%] left-[8%] right-[8%] font-display text-[clamp(8px,1vw,13px)] font-semibold leading-tight text-white">{project.title}</p>
              </div>
              <div className="flex flex-1 flex-col gap-[5%] p-[9%]">
                <div className="h-[6%] w-4/5 rounded bg-line" />
                <div className="h-[6%] w-3/5 rounded bg-line" />
                <div className="mt-auto h-[16%] rounded-full bg-ink" />
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- social media ---------- */

function SocialFrame({ project, play }: { project: Project; play: boolean }) {
  const reduced = useReducedMotion();
  const images = pics(project);
  const cells = images.length ? Array.from({ length: Math.max(12, Math.ceil(images.length / 3) * 3) }, (_, i) => images[i % images.length]) : [];
  const res = results(project);
  const handle = project.handle || project.title;
  const scroll = play && !reduced && cells.length > 9;

  return (
    <>
      {/* a single post card on the left */}
      {images[0] && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6, ease }} className="absolute left-[2%] top-[18%] w-[27%] overflow-hidden rounded-[clamp(10px,1.4vw,16px)] bg-white shadow-[0_30px_60px_-28px_rgba(18,15,27,0.5)]">
          <div className="flex items-center gap-[6%] p-[6%]">
            <span className="aspect-square w-[16%] rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${project.image || images[0]})` }} />
            <span className="truncate text-[clamp(7px,0.95vw,11px)] font-semibold">{handle}</span>
          </div>
          <img src={images[0]} alt="" className="aspect-square w-full object-cover" />
          <div className="flex gap-[8%] p-[6%] text-ink"><Heart size={14} /><MessageCircle size={14} /><Send size={14} /></div>
        </motion.div>
      )}

      <PhoneShell className="left-[34%] top-[1%] w-[31%]">
        <div className="flex items-center gap-[7%] px-[7%] pb-[3%] pt-[13%]">
          <span className="aspect-square w-[24%] shrink-0 rounded-full bg-gradient-to-tr from-[#f9a03f] via-[#d62976] to-[#962fbf] p-[2.5%]">
            <span className="block h-full w-full rounded-full border-2 border-white bg-mist bg-cover bg-center" style={project.image ? { backgroundImage: `url(${project.image})` } : undefined} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[clamp(8px,1.1vw,13px)] font-bold">{handle}</p>
            <p className="truncate text-[clamp(7px,0.9vw,11px)] text-muted">{project.category}</p>
          </div>
        </div>
        <div className="mx-[7%] mb-[4%] rounded-md bg-mist py-[3%] text-center text-[clamp(7px,0.9vw,11px)] font-semibold">Follow</div>
        <div className="relative h-full overflow-hidden">
          <motion.div
            className="grid grid-cols-3 gap-[2px]"
            animate={scroll ? { y: ["0%", "-30%", "0%"] } : { y: "0%" }}
            transition={scroll ? { duration: 16, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
          >
            {cells.map((src, i) => <img key={i} src={src} alt="" className="aspect-square w-full object-cover" />)}
          </motion.div>
        </div>
      </PhoneShell>

      <div className="absolute left-[69%] top-[16%] flex w-[29%] flex-col gap-[8%]">
        {res.slice(0, 3).map((r, i) => (
          <motion.div key={r} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12, duration: 0.5, ease }}>
            <ResultCard text={r} dark={i === 0} />
          </motion.div>
        ))}
      </div>
    </>
  );
}

/* ---------- video ---------- */

function VideoFrame({ project, play }: { project: Project; play: boolean }) {
  const res = results(project);
  const reel = project.videoShape === "reel" || /shorts\//.test(project.video ?? "");
  const media = project.video ? <VideoMedia url={project.video} poster={project.image} play={play} /> : <Poster src={project.image} />;

  if (reel) {
    return (
      <>
        <PhoneShell dark className="left-[35%] top-[1%] w-[31%]">
          <div className="absolute inset-0">{media}</div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-[8%] pt-[30%] text-white">
            <p className="truncate text-[clamp(8px,1vw,12px)] font-bold">{project.handle || project.title}</p>
            <p className="line-clamp-2 text-[clamp(7px,0.9vw,11px)] text-white/80">{project.summary}</p>
          </div>
          <div className="pointer-events-none absolute bottom-[22%] right-[6%] flex flex-col gap-[clamp(8px,1.6vw,16px)] text-white"><Heart size={16} /><MessageCircle size={16} /><Send size={16} /></div>
        </PhoneShell>
        <div className="absolute left-[2%] top-[22%] flex w-[29%] flex-col gap-[8%]">{res.slice(0, 2).map((r, i) => <ResultCard key={r} text={r} dark={i === 0} />)}</div>
        <div className="absolute left-[70%] top-[38%] w-[28%]">{res[2] && <ResultCard text={res[2]} />}</div>
      </>
    );
  }

  return (
    <>
      <div className="absolute left-[3%] top-[4%] w-[94%] overflow-hidden rounded-[clamp(10px,1.6vw,18px)] bg-ink shadow-[0_34px_70px_-30px_rgba(18,15,27,0.65)]">
        <div className="relative aspect-video">{media}</div>
        <div className="flex items-center gap-[2%] px-[3%] py-[1.6%] text-white">
          <Play size={14} />
          <span className="h-[4px] flex-1 overflow-hidden rounded-full bg-white/20">
            <motion.span className="block h-full bg-lav-400" animate={play ? { width: ["0%", "100%"] } : { width: "35%" }} transition={play ? { duration: 18, repeat: Infinity, ease: "linear" } : { duration: 0.3 }} />
          </span>
          <span className="truncate text-[clamp(8px,1vw,12px)] text-white/70">{project.title}</span>
        </div>
      </div>
      {res.length > 0 && (
        <div className="absolute bottom-[1%] right-[3%] flex w-[60%] justify-end gap-[3%]">
          {res.slice(0, 2).map((r, i) => <ResultCard key={r} text={r} dark={i === 0} className="flex-1" />)}
        </div>
      )}
    </>
  );
}

/* ---------- ads / marketing / promotion ---------- */

function AdsFrame({ project }: { project: Project }) {
  const res = results(project);
  const creative = pics(project)[0];
  const brand = project.handle || project.title;
  return (
    <>
      <div className="absolute left-[3%] top-[3%] w-[44%] overflow-hidden rounded-[clamp(10px,1.6vw,18px)] bg-white shadow-[0_34px_70px_-30px_rgba(18,15,27,0.5)]">
        <div className="flex items-center gap-[4%] p-[4%]">
          <span className="aspect-square w-[11%] shrink-0 rounded-full bg-mist bg-cover bg-center" style={project.image ? { backgroundImage: `url(${project.image})` } : undefined} />
          <div className="min-w-0">
            <p className="truncate text-[clamp(8px,1.05vw,13px)] font-bold">{brand}</p>
            <p className="text-[clamp(7px,0.85vw,10px)] text-muted">Sponsored</p>
          </div>
        </div>
        {project.summary && <p className="line-clamp-2 px-[4%] pb-[3%] text-[clamp(7px,0.95vw,12px)] leading-snug">{project.summary}</p>}
        <div className="aspect-[4/3] bg-mist">{creative && <img src={creative} alt="" className="h-full w-full object-cover" />}</div>
        <div className="flex items-center justify-between bg-mist px-[4%] py-[3%]">
          <span className="truncate text-[clamp(7px,0.9vw,11px)] font-semibold">{project.category}</span>
          <span className="rounded-md bg-ink px-[5%] py-[2%] text-[clamp(7px,0.9vw,11px)] font-semibold text-white">Learn more</span>
        </div>
      </div>
      <div className="absolute left-[52%] top-[6%] flex w-[45%] flex-col gap-[clamp(8px,1.8vw,16px)]">
        {res.slice(0, 4).map((r, i) => (
          <motion.div key={r} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease }}>
            <ResultCard text={r} dark={i === 0} />
          </motion.div>
        ))}
        {res.length === 0 && <p className="text-[clamp(10px,1.2vw,15px)] leading-relaxed text-muted">{project.summary}</p>}
      </div>
    </>
  );
}

/* ---------- graphic design ---------- */

const collage = [
  { l: "4%", t: "16%", w: "34%", r: -6 },
  { l: "30%", t: "4%", w: "30%", r: 3 },
  { l: "52%", t: "20%", w: "30%", r: -2 },
  { l: "70%", t: "6%", w: "26%", r: 5 },
  { l: "18%", t: "52%", w: "26%", r: 4 },
  { l: "60%", t: "56%", w: "24%", r: -4 },
];

function DesignFrame({ project }: { project: Project }) {
  const images = pics(project).slice(0, 6);
  return (
    <>
      {images.map((src, i) => {
        const c = collage[i];
        return (
          <motion.img
            key={src + i}
            src={src}
            alt=""
            initial={{ opacity: 0, y: 30, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: c.r }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.7, ease }}
            whileHover={{ rotate: 0, scale: 1.04, zIndex: 10 }}
            className="absolute aspect-[4/5] rounded-[clamp(8px,1.4vw,16px)] bg-white object-cover shadow-[0_30px_60px_-28px_rgba(18,15,27,0.55)]"
            style={{ left: c.l, top: c.t, width: c.w }}
          />
        );
      })}
    </>
  );
}

/* ---------- e-commerce management ---------- */

function EcommerceFrame({ project, play }: { project: Project; play: boolean }) {
  const res = results(project);
  const photos = (project.images ?? []).filter(Boolean);
  const items = (project.items ?? []).map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0]);
  const platforms = (project.platforms ?? []).filter(Boolean);
  const reduced = useReducedMotion();

  return (
    <>
      <div className="absolute left-[2%] top-[3%] h-[92%] w-[61%] overflow-hidden rounded-[clamp(10px,1.6vw,18px)] border border-line bg-white shadow-[0_34px_70px_-34px_rgba(18,15,27,0.5)]">
        <div className="flex items-center justify-between gap-[3%] border-b border-line px-[4%] py-[3%]">
          <p className="truncate text-[clamp(8px,1.1vw,13px)] font-bold">{project.handle || project.title}</p>
          <div className="flex shrink-0 gap-[clamp(3px,0.5vw,6px)]">
            {platforms.slice(0, 4).map((pl, i) => (
              <span key={pl} className={`rounded-full px-[clamp(5px,0.8vw,10px)] py-[2px] text-[clamp(6px,0.85vw,11px)] font-semibold ${i === 0 ? "bg-ink text-white" : "border border-line text-muted"}`}>{pl}</span>
            ))}
          </div>
        </div>
        {project.screen ? (
          <div className="relative h-[88%]"><ScrollShot src={project.screen} alt="" play={play} frameRatio={0.75} /></div>
        ) : (
          <>
            <div className="relative mx-[4%] mt-[4%] h-[38%] overflow-hidden rounded-[clamp(8px,1.2vw,12px)] bg-mist">
              <svg viewBox="0 0 300 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                <defs><linearGradient id="ecg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "rgb(var(--c-lav-500))" }} stopOpacity=".35" /><stop offset="1" style={{ stopColor: "rgb(var(--c-lav-500))" }} stopOpacity="0" /></linearGradient></defs>
                <path d="M0,108 L30,104 L60,100 L90,92 L120,94 L150,80 L180,70 L210,56 L240,44 L270,30 L300,14 L300,120 L0,120Z" fill="url(#ecg)" />
                <motion.path d="M0,108 L30,104 L60,100 L90,92 L120,94 L150,80 L180,70 L210,56 L240,44 L270,30 L300,14" className="stroke-lav-600" strokeWidth="3" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: play || reduced ? 1 : 0 }} transition={{ duration: 1.6, ease }} />
              </svg>
              <span className="absolute left-[3%] top-[6%] rounded-full bg-white px-[3%] py-[1%] text-[clamp(6px,0.85vw,11px)] font-semibold text-lav-700">Sales</span>
            </div>
            <div className="px-[4%] pt-[3%]">
              {(items.length ? items : [[project.title, "", ""]]).slice(0, 3).map(([name, price, note], i) => (
                <div key={name + i} className="flex items-center gap-[4%] border-t border-line py-[2.4%]">
                  <span className="aspect-square w-[11%] shrink-0 rounded-lg bg-lav-100 bg-cover bg-center" style={photos[i] || project.image ? { backgroundImage: `url(${photos[i] || project.image})` } : undefined} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[clamp(7px,1vw,12px)] font-semibold">{name}</p>
                    {(price || note) && <p className="truncate text-[clamp(6px,0.85vw,11px)] text-muted">{[price, note].filter(Boolean).join(" · ")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="absolute left-[66%] top-[6%] flex w-[32%] flex-col gap-[clamp(8px,1.6vw,14px)]">
        {res.slice(0, 4).map((r, i) => (
          <motion.div key={r} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease }}>
            <ResultCard text={r} dark={i === 0} />
          </motion.div>
        ))}
      </div>
    </>
  );
}

/* ---------- on-demand apps ---------- */

function OnDemandFrame({ project, play }: { project: Project; play: boolean }) {
  const res = results(project);
  const label = "absolute -translate-x-1/2 rounded-full bg-ink px-[clamp(6px,1vw,12px)] py-[clamp(2px,0.4vw,5px)] text-[clamp(7px,0.95vw,12px)] font-semibold text-white";

  return (
    <>
      {/* admin panel */}
      <div className="absolute left-[21%] top-[3%] h-[60%] w-[54%] overflow-hidden rounded-[clamp(8px,1.3vw,14px)] border border-line bg-white shadow-[0_34px_70px_-34px_rgba(18,15,27,0.5)]">
        <div className="flex gap-[1.2%] border-b border-line px-[3%] py-[2%]">{[0, 1, 2].map((i) => <span key={i} className="aspect-square w-[1.8%] rounded-full bg-line" />)}</div>
        {project.screen ? (
          <div className="relative h-[90%]"><ScrollShot src={project.screen} alt="" play={play} frameRatio={0.58} /></div>
        ) : (
          <div className="grid h-full grid-cols-[22%_1fr]">
            <div className="flex flex-col gap-[8%] bg-ink p-[12%]">
              <p className="truncate text-[clamp(6px,0.9vw,11px)] font-bold text-white">{project.handle || project.title}</p>
              <span className="h-[3%] rounded-full bg-lav-600" />
              {[0, 1, 2].map((i) => <span key={i} className="h-[3%] rounded-full bg-white/10" />)}
            </div>
            <div className="p-[4%]">
              <div className="grid grid-cols-3 gap-[4%]">{[0, 1, 2].map((i) => <div key={i} className="rounded-md bg-mist p-[8%]"><Bar w="45%" className="bg-lav-300" /><Bar w="75%" className="mt-[10%]" /></div>)}</div>
              <div className="mt-[5%] space-y-[3%]">{[0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-[4%] border-t border-line pt-[3%]"><Bar w="40%" /><Bar w="20%" /><span className="ml-auto h-[clamp(6px,1vw,10px)] w-[16%] rounded-full bg-lav-100" /></div>)}</div>
            </div>
          </div>
        )}
      </div>

      {/* customer app */}
      <PhoneShell className="left-[2%] top-[12%] w-[19%]">
        {project.mobile ? (
          <ScrollShot src={project.mobile} alt="" play={play} frameRatio={19 / 9} />
        ) : (
          <div className="flex h-full flex-col px-[9%] pt-[20%]">
            <p className="truncate text-[clamp(6px,0.9vw,11px)] font-bold">{project.title}</p>
            <p className="text-[clamp(5px,0.75vw,9px)] text-muted">Book a service</p>
            <div className="mt-[10%] grid grid-cols-3 gap-[6%]">{Array.from({ length: 6 }, (_, i) => <span key={i} className="aspect-square rounded-lg bg-lav-100" />)}</div>
            <span className="mt-[12%] block aspect-[2/1] rounded-lg bg-gradient-to-br from-lav-600 to-lav-400" />
            <span className="mb-[10%] mt-auto block rounded-full bg-ink py-[6%] text-center text-[clamp(5px,0.8vw,10px)] font-semibold text-white">Book now</span>
          </div>
        )}
      </PhoneShell>

      {/* partner app */}
      <PhoneShell dark className="left-[78%] top-[16%] w-[19%]">
        {project.partner ? (
          <ScrollShot src={project.partner} alt="" play={play} frameRatio={19 / 9} />
        ) : (
          <div className="flex h-full flex-col">
            <div className="relative h-[48%] bg-line">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                <path d="M0,25 L100,40 M0,70 L100,58 M30,0 L42,100 M74,0 L68,100" stroke="#fff" strokeWidth="5" />
                <motion.path d="M22,82 C40,62 52,58 70,30" className="stroke-lav-600" strokeWidth="3" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: play ? 1 : 0.3 }} transition={{ duration: 2, ease }} />
                <circle cx="22" cy="82" r="4" className="fill-ink" /><circle cx="70" cy="30" r="5" className="fill-lav-600" stroke="#fff" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col p-[9%] text-white">
              <p className="text-[clamp(5px,0.75vw,9px)] text-lav-300">New job</p>
              <Bar w="80%" className="mt-[4%] bg-white/25" />
              <Bar w="55%" className="mt-[4%] bg-white/15" />
              <div className="mt-auto mb-[10%] grid grid-cols-2 gap-[6%] text-center text-[clamp(5px,0.8vw,10px)] font-semibold">
                <span className="rounded-full border border-white/25 py-[8%]">Skip</span>
                <span className="rounded-full bg-lav-400 py-[8%] text-ink">Accept</span>
              </div>
            </div>
          </div>
        )}
      </PhoneShell>

      <span className={`${label} left-[11.5%] top-[72%]`}>Customer app</span>
      <span className={`${label} left-[48%] top-[65%]`}>Admin panel</span>
      <span className={`${label} left-[87.5%] top-[76%]`}>Partner app</span>

      <div className="absolute left-[24%] top-[73%] flex w-[50%] gap-[4%]">
        {res.slice(0, 2).map((r, i) => <ResultCard key={r} text={r} dark={i === 0} className="flex-1" />)}
      </div>
    </>
  );
}
