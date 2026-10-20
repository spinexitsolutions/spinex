"use client";

import { motion } from "framer-motion";
import { useContent } from "./ContentProvider";
import { track } from "@/lib/track";

const Logo = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.76 9.76 0 0 1-1.5-5.2c0-5.4 4.4-9.8 9.83-9.8a9.77 9.77 0 0 1 9.82 9.8c0 5.41-4.4 9.8-9.82 9.8zm8.36-18.16A11.75 11.75 0 0 0 12.04.2C5.5.2.2 5.5.2 12.03c0 2.1.55 4.13 1.58 5.93L.1 24l6.2-1.62a11.8 11.8 0 0 0 5.73 1.46h.01c6.53 0 11.84-5.3 11.84-11.83 0-3.16-1.23-6.13-3.48-8.37z" />
  </svg>
);

// Green WhatsApp button fixed to the bottom-left of every page (the chat assistant sits bottom-right).
export default function FloatingWhatsApp() {
  const { content } = useContent();
  const on = content.integrations?.whatsappButton ?? true;
  if (!on || !content.contact.whatsapp) return null;
  const href = `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(content.integrations?.whatsappText || "Hi Spinex!")}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => track("contact", { method: "whatsapp" })}
      aria-label="Chat with us on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.8, type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group fixed bottom-5 left-5 z-50 flex h-14 items-center gap-2 rounded-full bg-[#25D366] pl-3.5 pr-3.5 text-white shadow-[0_14px_40px_-10px_rgba(37,211,102,0.8)] sm:pr-5"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30 [animation-duration:2.5s] motion-reduce:hidden" aria-hidden />
      <Logo />
      <span className="hidden text-sm font-semibold sm:inline">Chat with us</span>
    </motion.a>
  );
}
