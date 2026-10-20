"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import { useContent } from "./ContentProvider";
import { OPEN_EVENT, readConsent, saveConsent } from "@/lib/consent";
import { ease } from "./Reveal";

// Cookie banner, switched on in Admin → WhatsApp and analytics (off by default).
// While it is on, analytics and ad tags load only after the visitor presses Accept.
export default function CookieBanner() {
  const { content } = useContent();
  const enabled = !!content.integrations?.cookieBanner;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!readConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [enabled]);

  const choose = (v: "accepted" | "rejected") => {
    saveConsent(v);
    setOpen(false);
  };

  if (!enabled) return null;
  const text = content.integrations.cookieText?.trim() || "We use cookies to understand how visitors use our website and to improve our ads. You can accept or reject them.";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie choice"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease }}
          className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl rounded-2xl border border-line bg-white p-5 shadow-[0_24px_60px_-24px_rgba(18,15,27,0.45)] sm:bottom-5 sm:left-5 sm:right-auto sm:mx-0"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lav-100 text-lav-700"><Cookie size={19} /></span>
            <p className="text-sm leading-relaxed text-ink/80">
              {text}{" "}
              <Link href="/privacy#cookies" className="font-semibold text-lav-700 underline">Privacy Policy</Link>
            </p>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => choose("rejected")} className="btn-ghost px-4 py-2.5 text-sm">Reject</button>
            <button type="button" onClick={() => choose("accepted")} className="btn-dark px-5 py-2.5 text-sm">Accept</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
