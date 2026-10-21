"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Link2, Linkedin, MessageCircle, X } from "lucide-react";

// Copies text. Uses the modern clipboard where allowed, otherwise the old method
// (needed on http:// pages and some phones).
async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* try the old way below */
  }
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const enc = encodeURIComponent;

  const copy = async () => {
    const ok = await copyText(url);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  };

  return (
    <div className="relative rounded-[20px] border border-line p-5">
      <p className="text-sm font-semibold">Share</p>
      <div className="mt-3 flex gap-2">
        <a href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp" className="grid h-11 w-11 place-items-center rounded-full border border-line transition hover:border-[#25D366] hover:text-[#25D366]"><MessageCircle size={17} /></a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn" title="Share on LinkedIn" className="grid h-11 w-11 place-items-center rounded-full border border-line transition hover:border-[#0A66C2] hover:text-[#0A66C2]"><Linkedin size={17} /></a>
        <button
          onClick={copy}
          aria-label="Copy link"
          title="Copy link"
          className={`grid h-11 w-11 place-items-center rounded-full border transition ${state === "copied" ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-line hover:border-ink"}`}
        >
          {state === "copied" ? <Check size={17} /> : <Link2 size={17} />}
        </button>
      </div>

      <div aria-live="polite">
        <AnimatePresence>
          {state !== "idle" && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${state === "copied" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {state === "copied" ? <><Check size={14} /> Link copied</> : <><X size={14} /> Couldn&apos;t copy. Copy it from the address bar.</>}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
