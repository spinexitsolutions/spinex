"use client";

import type { SiteContent } from "@/lib/content";
import { buildAutoReply } from "@/lib/auto-reply-text";

// Live preview of the thank-you email, filled with a sample enquiry.
export default function ReplyPreview({ content }: { content: SiteContent }) {
  const m = buildAutoReply(content, { name: "Rahul Sharma", services: "Website development", phone: "98765 43210", email: "rahul@example.com" });
  const off = !content.leadReplies.autoReply;
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-white ${off ? "opacity-50" : ""}`}>
      <div className="border-b border-line bg-mist px-5 py-3 text-sm">
        <p><span className="text-muted">To:</span> rahul@example.com</p>
        <p className="mt-0.5"><span className="text-muted">Subject:</span> <span className="font-semibold">{m.subject}</span></p>
      </div>
      <div className="p-5">
        <div className="max-w-[560px] text-[15px] leading-relaxed">
          <div className="rounded-t-2xl bg-ink px-6 py-4 text-lg font-bold text-white">{content.brand.name || "Spinex IT Solutions"}</div>
          <div className="rounded-b-2xl border border-t-0 border-line px-6 py-5">
            {m.title && <h3 className="mb-3 text-xl font-bold">{m.title}</h3>}
            {m.paragraphs.map((p, i) => <p key={i} className="mb-3 whitespace-pre-line">{p}</p>)}
            {m.button && <span className="mt-2 inline-block rounded-full bg-lav-600 px-5 py-2.5 text-sm font-semibold text-white">{m.button.label}</span>}
          </div>
        </div>
      </div>
      {off && <p className="border-t border-line px-5 py-3 text-sm text-muted">Turned off: visitors won&apos;t get this email.</p>}
    </div>
  );
}
