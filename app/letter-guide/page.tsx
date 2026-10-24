import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { getContent } from "@/lib/content-server";
import { LETTER_TEMPLATES } from "@/lib/letters";
import { GUIDE, GUIDE_REMINDERS, GUIDE_SITUATIONS, GUIDE_STAGES, GUIDE_STEPS } from "@/lib/letter-guide";
import { LETTER_FONT, letterFontVars } from "@/components/letters/fonts";
import PrintShell from "@/components/billing/PrintShell";

// "Which letter to issue, and when": a printable guide for the team (Admin → HR letters → Guide).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "HR letters guide", robots: { index: false, follow: false } };

const ACCENT = "#5b45c9";

export default async function LetterGuidePage() {
  if (process.env.LETTER_SAMPLES !== "1") {
    const session = await getSession().catch(() => null);
    if (!session) notFound();
    if (!can(session, "people", "view")) return <div className="grid min-h-screen place-items-center p-6 text-center text-muted">Your role doesn&apos;t have access to HR letters.</div>;
  }
  const content = await getContent();
  const company = content.brand.name || "Spinex IT Solutions";

  return (
    <PrintShell fileName={`${company} - HR letters guide`} extra={<Link href="/admin#letters" className="btn-ghost px-4 py-2.5 text-sm">Back to HR letters</Link>}>
      <article
        className={`${letterFontVars} guide-page mx-auto w-full max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[12.5px] leading-[1.55] text-[#1d1a26] shadow-[0_20px_60px_-30px_rgba(18,15,27,.45)] print:max-w-none print:p-0 print:shadow-none`}
        style={{ fontFamily: LETTER_FONT, fontKerning: "normal", letterSpacing: 0, wordSpacing: "0.04em", textRendering: "geometricPrecision" }}
      >
        <header className="flex items-end justify-between gap-6 pb-3" style={{ borderBottom: `2px solid ${ACCENT}` }}>
          <div className="flex items-center gap-3">
            {content.brand.logo ? <img src={content.brand.logo} alt="" className="h-10 w-auto object-contain" /> : null}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>{company} · HR guide</p>
              <h1 className="text-[22px] font-bold leading-tight">Which letter to issue, and when</h1>
            </div>
          </div>
          <p className="max-w-[60mm] text-right text-[10.5px] text-[#6b6680]">A quick reference to the 15 letters in Admin → HR letters: when to issue each one, to whom, and what to check.</p>
        </header>

        <section className="mt-5 break-inside-avoid">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>Quick reference</h2>
          <table className="mt-2 w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#f4f2fb] text-left print:bg-[#f4f2fb]">
                <th className="w-1/2 border border-[#e1ddef] px-2.5 py-1.5 font-bold">Situation</th>
                <th className="border border-[#e1ddef] px-2.5 py-1.5 font-bold">Letter to issue</th>
              </tr>
            </thead>
            <tbody>
              {GUIDE_SITUATIONS.map((s) => (
                <tr key={s.need}>
                  <td className="border border-[#e1ddef] px-2.5 py-1">{s.need}</td>
                  <td className="border border-[#e1ddef] px-2.5 py-1 font-semibold">{s.give}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>How to create a letter</h2>
          <ol className="mt-2 space-y-1">
            {GUIDE_STEPS.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: ACCENT }}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {GUIDE_STAGES.map((stage) => (
          <section key={stage.title} className="mt-6">
            <div className="break-after-avoid">
              <h2 className="text-[15px] font-bold">{stage.title}</h2>
              <p className="text-[11.5px] text-[#6b6680]">{stage.note}</p>
            </div>
            <div className="mt-2 space-y-2.5">
              {stage.types.map((type) => {
                const g = GUIDE[type];
                const t = LETTER_TEMPLATES[type];
                if (!g || !t) return null;
                return (
                  <div key={type} className="break-inside-avoid rounded-lg border border-[#e1ddef] px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13.5px] font-bold">{t.label}</p>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6b6680]">{t.certificate ? "Certificate form" : "A4 letter"}{t.acceptance ? " · Collect a signed copy" : ""}</p>
                    </div>
                    <dl className="mt-1.5 grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-[11.5px]">
                      <dt className="font-semibold text-[#6b6680]">When</dt><dd>{g.when}</dd>
                      <dt className="font-semibold text-[#6b6680]">To whom</dt><dd>{g.who}</dd>
                      <dt className="font-semibold text-[#6b6680]">Timing</dt><dd>{g.timing}</dd>
                      <dt className="font-semibold text-[#6b6680]">Details needed</dt><dd>{g.need.join(" · ")}</dd>
                    </dl>
                    <p className="mt-2 rounded-md bg-[#f4f2fb] px-3 py-1.5 text-[11.5px] print:bg-[#f4f2fb]"><span className="font-bold" style={{ color: ACCENT }}>Note: </span>{g.tip}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mt-6 break-inside-avoid rounded-lg border-2 px-4 py-3" style={{ borderColor: ACCENT }}>
          <h2 className="text-[13px] font-bold">Good practice</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11.5px]">
            {GUIDE_REMINDERS.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>

        <p className="mt-6 border-t border-[#e1ddef] pt-2 text-[10px] text-[#8a8499]">This guide reflects common practice in India and is not legal advice. Adapt it to your company policy.</p>
      </article>
    </PrintShell>
  );
}
