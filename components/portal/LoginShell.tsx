import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeIndianRupee, CalendarCheck, CalendarDays, FileText, LineChart, MessageSquare, ReceiptText } from "lucide-react";
import type { SiteContent } from "@/lib/content";

// Two-part login screen for the client portal and the staff portal: dark brand side + form side.
const KINDS = {
  client: {
    eyebrow: "Client portal",
    title: ["Your project,", "all in", "one place."],
    lead: "Track progress, download files, pay invoices and talk to our team.",
    pills: [["Live progress", LineChart], ["Files", FileText], ["Invoices", ReceiptText], ["Support", MessageSquare]] as const,
  },
  staff: {
    eyebrow: "Staff portal",
    title: ["Your work day,", "all in", "one place."],
    lead: "Check in, apply for leave and download your payslips.",
    pills: [["Check in", CalendarCheck], ["Leave", CalendarDays], ["Payslips", BadgeIndianRupee]] as const,
  },
};

export default function LoginShell({ kind, content, children }: { kind: keyof typeof KINDS; content: SiteContent; children: React.ReactNode }) {
  const k = KINDS[kind];
  const name = content.brand.name || "Spinex";
  const logo = !content.brand.logo || content.brand.logo === "/brand/logo.png" ? "/brand/icon.svg" : content.brand.logo;
  const wa = String(content.contact?.whatsapp ?? "").replace(/\D/g, "");
  const waLink = wa ? `https://wa.me/${wa.length === 10 ? `91${wa}` : wa}?text=${encodeURIComponent(`Hi, I need help logging in to the ${k.eyebrow.toLowerCase()}.`)}` : "";

  return (
    <main className="grid min-h-[100svh] bg-white lg:grid-cols-2">
      {/* brand side */}
      <section className="relative flex flex-col overflow-hidden bg-[#0e0b16] px-6 pb-10 pt-6 text-white sm:px-10 lg:px-16 lg:py-11">
        <div aria-hidden className="pointer-events-none absolute -right-60 -top-56 h-[560px] w-[640px] rounded-full bg-lav-600 opacity-40 blur-[140px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-36 -left-44 h-[380px] w-[420px] rounded-full bg-[#b46ad8] opacity-[0.16] blur-[150px]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_30%_40%,#000_20%,transparent_70%)]" />

        <Link href="/" className="relative flex w-fit items-center gap-2.5 font-display text-xl font-bold tracking-tight">
          <img src={logo} alt="" className="h-8 w-8 object-contain" /> {name}
        </Link>

        <div className="relative mt-10 lg:my-auto lg:mt-0">
          <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-lav-300">
            <span className="h-px w-6 bg-lav-400" /> {k.eyebrow}
          </p>
          <h2 className="h-display mt-4 text-[2.4rem] sm:text-5xl lg:text-[3.6rem]">
            {k.title[0]}<br />{k.title[1]} <span className="bg-gradient-to-r from-lav-300 to-lav-400 bg-clip-text text-transparent">{k.title[2]}</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60 sm:text-base">{k.lead}</p>
          <ul className="mt-6 hidden flex-wrap gap-2 sm:flex">
            {k.pills.map(([label, Icon]) => (
              <li key={label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[13.5px] font-medium text-white/80">
                <Icon size={15} className="text-lav-400" /> {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-auto hidden pt-10 text-xs text-white/35 lg:block">© {name}, Jaipur</p>
      </section>

      {/* form side */}
      <section className="flex flex-col px-6 py-6 sm:px-10 lg:px-16 lg:py-11">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <Link href="/" className="flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} /> Back to website</Link>
          {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" className="hover:text-ink">Need help? <b className="text-ink">WhatsApp us</b></a>}
        </div>
        <div className="mx-auto my-10 w-full max-w-[420px] lg:my-auto">{children}</div>
        {kind === "client" && (
          <p className="text-center text-sm text-muted">
            Not a client yet? <Link href="/contact" className="inline-flex items-center gap-1 font-semibold text-lav-700 hover:underline">Start a project <ArrowRight size={14} /></Link>
          </p>
        )}
      </section>
    </main>
  );
}
