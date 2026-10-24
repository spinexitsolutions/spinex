import { Fragment } from "react";
import { fillWording, letterSigners, letterValues, longDate, salaryTotal, showsAsCertificate, templateFor, toBlocks, type Letter, type Letterhead } from "@/lib/letters";
import CertificateDocument from "./CertificateDocument";
import { LETTER_FONT, letterFontVars } from "./fonts";

// One A4 letter on the company letterhead. Used in the admin editor preview, the PDF view and the person's link.
// Built to fit on one page: compact letterhead, short wording, signatures in one row of up to three.
// Plain markup only, so it prints the same everywhere.
const ACCENT = "#5b45c9";

export default function LetterDocument(props: { letter: Letter; head: Letterhead; logo?: string; qr?: string; verifyUrl: string }) {
  if (showsAsCertificate(props.letter)) return <CertificateDocument {...props} />;
  return <LetterPage {...props} />;
}

function LetterPage({ letter, head, logo, qr, verifyUrl }: { letter: Letter; head: Letterhead; logo?: string; qr?: string; verifyUrl: string }) {
  const t = templateFor(letter.type);
  const values = letterValues(letter, head.legalName);
  const blocks = toBlocks(fillWording(letter.body, values));
  const subject = fillWording(letter.subject, values);
  const signers = letterSigners(letter, head);
  const lines = (s: string) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const rows = letter.salary.filter((r) => r.label.trim() && r.monthly > 0);
  const total = salaryTotal(rows);
  const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const showVerify = letter.status === "issued" && !!letter.verifyCode;
  const signRow = signers.length ? signers : [{ id: "blank", name: "", title: "Authorised signatory", image: "", show: true }];
  const contact = [head.phone, head.email, head.website].filter(Boolean);

  return (
    <article style={{ fontFamily: LETTER_FONT, fontKerning: "normal", letterSpacing: 0, wordSpacing: "0.04em", textRendering: "geometricPrecision", WebkitFontSmoothing: "antialiased" }} className={`${letterFontVars} letter-page relative mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col overflow-hidden bg-white px-[16mm] pb-[10mm] pt-[12mm] text-[12.5px] leading-[1.55] text-[#1d1a26] shadow-[0_20px_60px_-30px_rgba(18,15,27,.45)] print:min-h-[262mm] print:max-w-none print:overflow-visible print:p-0 print:shadow-none`}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-[5px] print:hidden" style={{ background: `linear-gradient(90deg, ${ACCENT}, #9d8cf0)` }} />
      {letter.status !== "issued" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className={`rotate-[-28deg] rounded-xl border-4 px-8 py-2 text-7xl font-bold uppercase tracking-[0.2em] ${letter.status === "revoked" ? "border-red-500/30 text-red-500/25" : "border-[#1d1a26]/10 text-[#1d1a26]/10"}`}>
            {letter.status === "revoked" ? "Revoked" : "Draft"}
          </span>
        </div>
      )}

      {/* Letterhead */}
      <header className="flex items-center justify-between gap-6 pb-3" style={{ borderBottom: `1.5px solid ${ACCENT}` }}>
        <div className="flex min-w-0 items-center gap-3">
          {logo ? <img src={logo} alt="" className="h-11 w-auto max-w-[110px] object-contain" /> : null}
          <div className="min-w-0">
            <p className="text-[18px] font-bold leading-tight tracking-[-0.01em]">{head.legalName}</p>
            {lines(head.address).length > 0 && <p className="text-[10.5px] leading-snug text-[#6b6680]">{lines(head.address).join(", ")}</p>}
          </div>
        </div>
        {contact.length > 0 && (
          <div className="shrink-0 text-right text-[10.5px] leading-[1.55] text-[#6b6680]">
            {contact.map((c) => <p key={c}>{c}</p>)}
          </div>
        )}
      </header>

      <div className="mt-3 flex justify-between gap-4 text-[11.5px]">
        <p><span className="text-[#8a8499]">Ref. </span><span className="font-semibold">{letter.number}</span></p>
        <p><span className="text-[#8a8499]">Date </span><span className="font-semibold">{longDate(letter.date)}</span></p>
      </div>

      {t.toWhom ? (
        <div className="mt-6 text-center">
          <p className="inline-block border-b-2 pb-1 text-[15px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: ACCENT }}>{subject}</p>
          <p className="mt-5 text-left font-semibold">To Whom It May Concern</p>
        </div>
      ) : (
        <>
          <div className="mt-4 leading-[1.45]">
            <p className="text-[#8a8499]">To</p>
            <p className="font-semibold">{values.fullName || "______"}</p>
            {lines(letter.person.address).map((l, i) => <p key={i}>{l}</p>)}
          </div>
          <p className="mt-3"><span className="font-bold">Subject: </span><span className="font-semibold">{subject}</span></p>
        </>
      )}

      {/* Letter text */}
      <div className="mt-3 space-y-2">
        {blocks.map((b, i) =>
          b.kind === "h" ? (
            <p key={i} className="pt-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: ACCENT }}>{rich(b.lines[0])}</p>
          ) : b.kind === "ul" ? (
            <ul key={i} className="space-y-0.5 pl-4" style={{ listStyleType: "square" }}>{b.lines.map((l, j) => <li key={j} className="pl-1 marker:text-[#9d8cf0]">{rich(l)}</li>)}</ul>
          ) : (
            <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{rich(l)}</Fragment>)}</p>
          ),
        )}
      </div>

      {t.salary && rows.length > 0 && (
        <section className="mt-3 break-inside-avoid">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: ACCENT }}>Salary break-up</p>
          <table className="mt-1 w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#f4f2fb] text-left print:bg-[#f4f2fb]">
                <th className="border border-[#e1ddef] px-2.5 py-1 font-semibold">Component</th>
                <th className="w-[26%] border border-[#e1ddef] px-2.5 py-1 text-right font-semibold">Monthly</th>
                <th className="w-[26%] border border-[#e1ddef] px-2.5 py-1 text-right font-semibold">Annual</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="border border-[#e1ddef] px-2.5 py-1">{r.label}</td>
                  <td className="border border-[#e1ddef] px-2.5 py-1 text-right tabular-nums">{rs(r.monthly)}</td>
                  <td className="border border-[#e1ddef] px-2.5 py-1 text-right tabular-nums">{rs(r.monthly * 12)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-[#e1ddef] px-2.5 py-1">Total (CTC)</td>
                <td className="border border-[#e1ddef] px-2.5 py-1 text-right tabular-nums">{rs(total)}</td>
                <td className="border border-[#e1ddef] px-2.5 py-1 text-right tabular-nums">{rs(total * 12)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Signatures: one row of up to three, same width each */}
      <section className="mt-5 break-inside-avoid">
        <p className="font-semibold">For {head.legalName}</p>
        <div className="mt-1 grid grid-cols-3 gap-x-6 gap-y-3">
          {signRow.map((sg) => (
            <div key={sg.id} className="min-w-0">
              <div className="flex h-12 items-end">{sg.image ? <img src={sg.image} alt="" className="max-h-12 w-auto max-w-full object-contain" /> : null}</div>
              <p className="mt-1 truncate border-t border-[#1d1a26] pt-1 text-[12px] font-semibold">{sg.name || " "}</p>
              <p className="truncate text-[10.5px] text-[#6b6680]">{sg.title || "Authorised signatory"}</p>
            </div>
          ))}
        </div>
      </section>

      {t.acceptance && (
        <section className="mt-4 break-inside-avoid rounded-lg border border-[#e1ddef] bg-[#faf9fd] px-4 py-2.5 print:bg-[#faf9fd]">
          <p className="text-[11.5px]"><span className="font-bold">Acceptance:</span> I accept this {t.code === "IO" ? "internship offer" : t.code === "OL" ? "offer" : "appointment"} on the terms above.</p>
          <div className="mt-6 grid grid-cols-3 gap-6 text-[10.5px] text-[#6b6680]">
            <p className="border-t border-[#1d1a26] pt-0.5">Signature</p>
            <p className="truncate border-t border-[#1d1a26] pt-0.5">Name: <span className="font-semibold text-[#1d1a26]">{values.name}</span></p>
            <p className="border-t border-[#1d1a26] pt-0.5">Date</p>
          </div>
        </section>
      )}

      <footer className="mt-auto break-inside-avoid pt-5">
        <div className="flex items-center gap-3 border-t border-[#e1ddef] pt-2.5 text-[9.5px] leading-[1.5] text-[#8a8499]">
          {showVerify && qr ? <img src={qr} alt="" className="h-[14mm] w-[14mm] shrink-0" /> : null}
          <p className="min-w-0 flex-1">
            {showVerify ? (
              <>Verify this letter at <span className="font-semibold text-[#1d1a26]">{verifyUrl}</span> with code <span className="font-mono font-semibold text-[#1d1a26]">{letter.verifyCode}</span>, or scan the QR code.</>
            ) : letter.status === "revoked" ? (
              "This letter has been withdrawn by the company and is not valid."
            ) : (
              "Draft. Issue the letter to add its verification code and QR code."
            )}
          </p>
          <p className="shrink-0 text-right">{[head.legalName, head.gstin && `GSTIN ${head.gstin}`].filter(Boolean).join(" · ")}</p>
        </div>
      </footer>
    </article>
  );
}

// **bold** inside a line.
function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}
