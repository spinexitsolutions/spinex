"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { formatDate, type Intern } from "@/lib/interns";
import type { SiteContent } from "@/lib/content";

type Settings = SiteContent["certificate"];

const serif = { fontFamily: "var(--font-serif), Georgia, 'Times New Roman', serif" };
const script = { fontFamily: "var(--font-script), 'Brush Script MT', cursive" };
const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k) => values[k] ?? m);

// A4 landscape certificate. Sizes use container units (cqw) so it scales on screen
// and prints at exactly 297 x 210 mm.
export default function Certificate({ intern, settings, company, logo, qr }: { intern: Intern; settings: Settings; company: string; logo: string; qr: string }) {
  const body = fill(settings.body, {
    name: intern.name,
    role: intern.role || "an intern",
    company,
    start: formatDate(intern.startDate) || "the start date",
    end: formatDate(intern.endDate || intern.issuedOn),
  });
  // Older wording started with "for ...", which reads after "presented to".
  const signers = (settings.signers ?? []).filter((sg) => sg.name.trim()).slice(0, 3);
  const lead = /^\s*for\b/i.test(settings.body) ? "This certificate is proudly presented to" : "This is to certify that";
  const [titleMain, ...titleRest] = settings.title.replace(/^certificate\s*/i, "").length
    ? ["Certificate", settings.title.replace(/^certificate\s*/i, "")]
    : [settings.title];

  return (
    <div className="min-h-screen bg-mist py-8 print:bg-white print:p-0">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          html, body { background: #fff !important; }
          .cert { width: 297mm !important; height: 210mm !important; max-width: none !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
        }
      `}</style>

      <div className="mx-auto mb-6 flex max-w-[1123px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link href="/admin" className="btn-ghost bg-white"><ArrowLeft size={16} /> Back to admin</Link>
        <div className="flex flex-wrap items-center gap-3">
          <p className="max-w-sm text-sm text-muted">In the print window choose <b>Save as PDF</b>, layout <b>Landscape</b>, margins <b>None</b> and turn on <b>Background graphics</b>.</p>
          <button onClick={() => window.print()} className="btn-dark"><Printer size={17} /> Download PDF / Print</button>
        </div>
      </div>

      <div className="cert relative mx-auto aspect-[297/210] w-[calc(100%-2rem)] max-w-[1123px] overflow-hidden rounded-md bg-white text-ink shadow-[0_30px_80px_-30px_rgba(18,15,27,0.35)]" style={{ containerType: "inline-size" }}>
        {/* Corner shapes */}
        <div aria-hidden className="absolute right-0 top-0 h-[22cqw] w-[22cqw] bg-lav-500" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
        <div aria-hidden className="absolute right-0 top-0 h-[19cqw] w-[19cqw] bg-ink" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
        <div aria-hidden className="absolute bottom-0 left-0 h-[10cqw] w-[10cqw] bg-lav-500" style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }} />
        <div aria-hidden className="absolute bottom-0 left-0 h-[8cqw] w-[8cqw] bg-ink" style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }} />

        {/* Frame */}
        <div aria-hidden className="absolute inset-[2.2cqw] border-[0.22cqw] border-ink" />
        <div aria-hidden className="absolute inset-[2.9cqw] border-[0.08cqw] border-lav-500" />

        {/* Seal on the corner */}
        <div className="absolute right-[3.6cqw] top-[3.6cqw] h-[11.5cqw] w-[11.5cqw] rounded-full bg-white p-[0.5cqw] shadow-[0_0.6cqw_1.6cqw_rgba(18,15,27,0.25)]">
          <Seal />
        </div>

        {/* Watermark */}
        <img aria-hidden src={logo} alt="" className="pointer-events-none absolute left-1/2 top-1/2 h-[34cqw] w-[34cqw] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.04]" />

        <div className="absolute inset-[2.9cqw] flex flex-col px-[5cqw] pb-[2.6cqw] pt-[3cqw]">
          {/* Header */}
          <div className="flex items-center gap-[1.3cqw]">
            <img src={logo} alt="" className="h-[5.2cqw] w-[5.2cqw] object-contain" />
            <div>
              <p className="font-display text-[1.9cqw] font-semibold leading-none tracking-tight">{company}</p>
              <p className="mt-[0.45cqw] text-[0.95cqw] tracking-[0.06em] text-muted">Web development, e-commerce and digital solutions, Jaipur</p>
            </div>
          </div>

          {/* Title */}
          <div className="mt-[2.4cqw] text-center">
            <p className="text-[4.6cqw] font-semibold uppercase leading-none tracking-[0.14em]" style={serif}>{titleMain}</p>
            {titleRest[0] && (
              <div className="mt-[1cqw] flex items-center justify-center gap-[1.4cqw]">
                <span className="h-[0.1cqw] w-[7cqw] bg-lav-500" />
                <p className="text-[1.45cqw] font-semibold uppercase tracking-[0.35em] text-lav-700">{titleRest[0]}</p>
                <span className="h-[0.1cqw] w-[7cqw] bg-lav-500" />
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className="mt-[2.3cqw] text-center">
            <p className="text-[1.4cqw] italic text-muted" style={serif}>{lead}</p>
            <p className="mx-auto mt-[0.6cqw] inline-block border-b-[0.12cqw] border-ink/25 px-[3cqw] pb-[0.5cqw] text-[4.2cqw] font-semibold italic leading-tight" style={serif}>
              {intern.name}
            </p>
            <p className="mx-auto mt-[1.6cqw] max-w-[62cqw] text-[1.45cqw] leading-[1.7] text-ink/80">{body}</p>
            {intern.work && <p className="mx-auto mt-[0.8cqw] max-w-[60cqw] text-[1.2cqw] italic text-muted" style={serif}>Key work: {intern.work}</p>}
          </div>

          {/* Signatures */}
          <div className={`mt-auto grid items-end gap-[3cqw] ${signers.length === 1 ? "grid-cols-1" : signers.length === 2 ? "grid-cols-2 px-[8cqw]" : "grid-cols-3"}`}>
            {signers.map((sg) => (
              <div key={sg.id} className="text-center">
                <div className="flex h-[4.4cqw] items-end justify-center">
                  {sg.image ? (
                    <img src={sg.image} alt="" className="max-h-full max-w-[18cqw] object-contain" />
                  ) : (
                    <span className="text-[2.7cqw] leading-none text-ink/85" style={script}>{sg.name}</span>
                  )}
                </div>
                <div className="mx-auto mt-[0.4cqw] h-[0.1cqw] w-[17cqw] bg-ink/40" />
                <p className="mt-[0.6cqw] text-[1.2cqw] font-semibold">{sg.name}</p>
                <p className="text-[0.95cqw] text-muted">{sg.title}</p>
              </div>
            ))}
          </div>

          {/* Footer: number + QR */}
          <div className="mt-[1.6cqw] flex items-end justify-between gap-[2cqw] border-t-[0.08cqw] border-line pt-[1cqw]">
            <div className="text-[0.95cqw] leading-relaxed text-muted">
              <p>Certificate no. <span className="font-mono font-semibold text-ink">{intern.certId}</span>, issued on {formatDate(intern.issuedOn)}</p>
              <p>Verify at {settings.verifyUrl}</p>
            </div>
            <div className="flex items-center gap-[0.9cqw]">
              <p className="text-right text-[0.85cqw] leading-snug text-muted">Scan to<br />verify</p>
              <img src={qr} alt={`QR code to verify certificate ${intern.certId}`} className="h-[5.6cqw] w-[5.6cqw]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Round seal with the company name around the edge.
function Seal() {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
        <defs>
          <path id="seal-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <circle cx="60" cy="60" r="58" fill="#120F1B" />
        <circle cx="60" cy="60" r="54" fill="none" stroke="#A595FB" strokeWidth="1.2" />
        <circle cx="60" cy="60" r="34" fill="#6E59D9" />
        <circle cx="60" cy="60" r="30" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" strokeDasharray="2 2" />
        <text fill="#fff" fontSize="8.4" fontWeight="700" letterSpacing="2.2">
          <textPath href="#seal-ring">SPINEX IT SOLUTIONS ★ CERTIFIED ★</textPath>
        </text>
        <path d="M49 60 l7 7 l15 -15" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
