"use client";

import { useState } from "react";
import { Check, Link2, Linkedin, MessageCircle } from "lucide-react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <div className="rounded-[20px] border border-line p-5">
      <p className="text-sm font-semibold">Share</p>
      <div className="mt-3 flex gap-2">
        <a href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp" className="grid h-11 w-11 place-items-center rounded-full border border-line hover:border-ink"><MessageCircle size={17} /></a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn" className="grid h-11 w-11 place-items-center rounded-full border border-line hover:border-ink"><Linkedin size={17} /></a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copy link"
          className="grid h-11 w-11 place-items-center rounded-full border border-line hover:border-ink"
        >
          {copied ? <Check size={17} className="text-emerald-600" /> : <Link2 size={17} />}
        </button>
      </div>
    </div>
  );
}
