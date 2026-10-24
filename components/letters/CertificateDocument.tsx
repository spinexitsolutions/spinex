import { Fragment } from "react";
import { fillWording, letterSigners, letterValues, longDate, toBlocks, type Letter, type Letterhead } from "@/lib/letters";
import { Seal } from "../admin/Certificate";
import { LETTER_FONT, letterFontVars } from "./fonts";

// Certificate form (A4 landscape) for experience, internship completion, NOC and other "to whom it may concern" letters.
// Sizes use container units (cqw), so it scales on screen and prints at exactly 297 x 210 mm.
const serif = { fontFamily: "var(--font-cert-serif), Georgia, 'Times New Roman', serif" };

export default function CertificateDocument({ letter, head, logo, qr, verifyUrl }: { letter: Letter; head: Letterhead; logo?: string; qr?: string; verifyUrl: string }) {
  const values = letterValues(letter, head.legalName);
  const text = fillWording(letter.body, values);
  const title = fillWording(letter.subject, values);
  const signers = letterSigners(letter, head).slice(0, 3);
  const showVerify = letter.status === "issued" && !!letter.verifyCode;

  // "This is to certify that **Name** (Employee ID …) was employed …" → lead line, big name, then the rest.
  const m = text.match(/^\s*This is to certify that\s+\*\*([^*]+)\*\*\s*(\([^)]*\))?\s*,?\s*/i);
  const lead = m ? "This is to certify that" : "";
  const name = m ? m[1] : values.fullName;
  const idNote = m?.[2]?.replace(/^\(|\)$/g, "") ?? "";
  const rest = m ? text.slice(m[0].length) : text;
  const blocks = toBlocks(rest);
  const length = rest.replace(/\*\*/g, "").length;
  const bodySize = length > 700 ? "text-[1.08cqw]" : length > 450 ? "text-[1.2cqw]" : "text-[1.34cqw]";
  const [main, ...more] = title.split(/\s+/);
  const titleSmall = /certificate$/i.test(title) ? title.replace(/\s*certificate$/i, "") : more.join(" ");
  const titleBig = /certificate$/i.test(title) ? "Certificate" : main;

  return (
    <div
      className={`${letterFontVars} cert-page relative mx-auto aspect-[297/210] w-full max-w-[297mm] overflow-hidden bg-white text-[#1d1a26] shadow-[0_30px_80px_-30px_rgba(18,15,27,0.35)]`}
      style={{ containerType: "inline-size", fontFamily: LETTER_FONT, fontKerning: "normal", letterSpacing: 0 }}
    >
      <style>{`
        @page cert { size: A4 landscape; margin: 0; }
        @media print {
          .cert-page { page: cert; width: 297mm !important; height: 210mm !important; max-width: none !important; box-shadow: none !important; margin: 0 !important; break-inside: avoid; }
        }
      `}</style>

      {/* Corners and frame */}
      <div aria-hidden className="absolute right-0 top-0 h-[20cqw] w-[20cqw] bg-[#7c68e0]" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
      <div aria-hidden className="absolute right-0 top-0 h-[17cqw] w-[17cqw] bg-[#1d1a26]" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
      <div aria-hidden className="absolute bottom-0 left-0 h-[9cqw] w-[9cqw] bg-[#7c68e0]" style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }} />
      <div aria-hidden className="absolute bottom-0 left-0 h-[7cqw] w-[7cqw] bg-[#1d1a26]" style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }} />
      <div aria-hidden className="absolute inset-[2.2cqw] border-[0.2cqw] border-[#1d1a26]" />
      <div aria-hidden className="absolute inset-[2.85cqw] border-[0.07cqw] border-[#7c68e0]" />
      <div className="absolute right-[3.6cqw] top-[3.6cqw] h-[10cqw] w-[10cqw] rounded-full bg-white p-[0.45cqw] shadow-[0_0.6cqw_1.6cqw_rgba(18,15,27,0.25)]">
        <Seal />
      </div>
      {logo && <img aria-hidden src={logo} alt="" className="pointer-events-none absolute left-1/2 top-1/2 h-[30cqw] w-[30cqw] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.04]" />}
      {letter.status !== "issued" && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <span className={`rotate-[-18deg] rounded-[1cqw] border-[0.4cqw] px-[3cqw] py-[0.6cqw] text-[7cqw] font-bold uppercase tracking-[0.2em] ${letter.status === "revoked" ? "border-red-500/30 text-red-500/25" : "border-[#1d1a26]/10 text-[#1d1a26]/10"}`}>
            {letter.status === "revoked" ? "Revoked" : "Draft"}
          </span>
        </div>
      )}

      <div className="absolute inset-[2.85cqw] flex flex-col px-[5cqw] pb-[2.2cqw] pt-[2.8cqw]">
        {/* Company */}
        <div className="flex items-center gap-[1.2cqw] pr-[12cqw]">
          {logo && <img src={logo} alt="" className="h-[4.6cqw] w-[4.6cqw] object-contain" />}
          <div className="min-w-0">
            <p className="text-[1.85cqw] font-bold leading-none">{head.legalName}</p>
            <p className="mt-[0.45cqw] truncate text-[0.95cqw] text-[#6b6680]">{[head.address.split("\n").map((x) => x.trim()).filter(Boolean).join(", "), head.website].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        {/* Title */}
        <div className="mt-[2cqw] text-center">
          <p className="text-[4.2cqw] font-semibold uppercase leading-none tracking-[0.12em]" style={serif}>{titleBig}</p>
          {titleSmall && (
            <div className="mt-[0.9cqw] flex items-center justify-center gap-[1.3cqw]">
              <span className="h-[0.1cqw] w-[6.5cqw] bg-[#7c68e0]" />
              <p className="text-[1.35cqw] font-bold uppercase tracking-[0.3em] text-[#5b45c9]">{titleSmall}</p>
              <span className="h-[0.1cqw] w-[6.5cqw] bg-[#7c68e0]" />
            </div>
          )}
        </div>

        {/* Person */}
        <div className="mt-[1.8cqw] text-center">
          {lead && <p className="text-[1.35cqw] italic text-[#6b6680]" style={serif}>{lead}</p>}
          <p className="mx-auto mt-[0.4cqw] inline-block border-b-[0.12cqw] border-[#1d1a26]/25 px-[3cqw] pb-[0.4cqw] text-[3.6cqw] font-semibold italic leading-tight" style={serif}>{name || "______"}</p>
          {idNote && <p className="mt-[0.5cqw] text-[1cqw] text-[#6b6680]">{idNote}</p>}
          <div className={`mx-auto mt-[1.2cqw] max-w-[66cqw] space-y-[0.7cqw] leading-[1.65] text-[#2b2738] ${bodySize}`}>
            {blocks.map((b, i) => (
              <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{b.kind === "ul" ? "• " : ""}{rich(l)}</Fragment>)}</p>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-auto grid grid-cols-3 items-end gap-[3cqw] px-[2cqw]">
          {(signers.length ? signers : [{ id: "blank", name: "", title: "Authorised signatory", image: "", show: true }]).map((sg, i, arr) => (
            <div key={sg.id} className={`text-center ${arr.length === 1 ? "col-start-2" : arr.length === 2 && i === 0 ? "col-start-1" : ""} ${arr.length === 2 && i === 1 ? "col-start-3" : ""}`}>
              <div className="flex h-[4cqw] items-end justify-center">{sg.image ? <img src={sg.image} alt="" className="max-h-full max-w-[16cqw] object-contain" /> : null}</div>
              <div className="mx-auto mt-[0.3cqw] h-[0.08cqw] w-[16cqw] bg-[#1d1a26]/50" />
              <p className="mt-[0.5cqw] text-[1.15cqw] font-bold">{sg.name || " "}</p>
              <p className="text-[0.9cqw] text-[#6b6680]">{sg.title || "Authorised signatory"}</p>
            </div>
          ))}
        </div>

        {/* Number, date and QR */}
        <div className="mt-[1.4cqw] flex items-end justify-between gap-[2cqw] border-t-[0.07cqw] border-[#e1ddef] pt-[0.9cqw]">
          <div className="text-[0.9cqw] leading-relaxed text-[#6b6680]">
            <p>Ref. <span className="font-bold text-[#1d1a26]">{letter.number}</span> · Issued on {longDate(letter.date)}</p>
            <p>
              {showVerify ? <>Verify at <span className="font-bold text-[#1d1a26]">{verifyUrl}</span> with code <span className="font-mono font-bold text-[#1d1a26]">{letter.verifyCode}</span></> : letter.status === "revoked" ? "Withdrawn by the company. Not valid." : "Draft. Issue it to add the verification code."}
            </p>
          </div>
          {showVerify && qr ? (
            <div className="flex items-center gap-[0.8cqw]">
              <p className="text-right text-[0.8cqw] leading-snug text-[#6b6680]">Scan to<br />verify</p>
              <img src={qr} alt="" className="h-[5.2cqw] w-[5.2cqw]" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}
