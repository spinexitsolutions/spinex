import { Fragment } from "react";
import { fillWording, letterSigners, letterValues, longDate, salaryTotal, templateFor, toBlocks, type Letter, type Letterhead } from "@/lib/letters";

// One A4 letter on the company letterhead. Used in the admin editor preview, the PDF view and the person's link.
// Plain markup only, so it prints the same everywhere.
export default function LetterDocument({ letter, head, logo, qr, verifyUrl }: { letter: Letter; head: Letterhead; logo?: string; qr?: string; verifyUrl: string }) {
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

  return (
    <article className="letter-page relative mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-white px-[18mm] py-[14mm] text-[13px] leading-[1.65] text-[#1d1a26] shadow-[0_20px_60px_-30px_rgba(18,15,27,.45)] print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      {letter.status !== "issued" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden print:fixed">
          <span className={`rotate-[-28deg] rounded-xl border-4 px-8 py-2 text-7xl font-bold uppercase tracking-[0.2em] ${letter.status === "revoked" ? "border-red-500/30 text-red-500/25" : "border-[#1d1a26]/10 text-[#1d1a26]/10"}`}>
            {letter.status === "revoked" ? "Revoked" : "Draft"}
          </span>
        </div>
      )}

      <header className="flex items-start justify-between gap-6 border-b-2 border-[#1d1a26] pb-4">
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="" className="h-12 w-auto max-w-[120px] object-contain" /> : null}
          <div>
            <p className="text-[19px] font-bold leading-tight">{head.legalName}</p>
            {head.website && <p className="text-[11.5px] text-[#5b566b]">{head.website}</p>}
          </div>
        </div>
        <div className="text-right text-[11.5px] leading-[1.5] text-[#5b566b]">
          {lines(head.address).map((l, i) => <p key={i}>{l}</p>)}
          {head.phone && <p>{head.phone}</p>}
          {head.email && <p>{head.email}</p>}
        </div>
      </header>

      <div className="mt-5 flex justify-between gap-4 text-[12.5px]">
        <p><span className="text-[#8a8499]">Ref: </span><span className="font-semibold">{letter.number}</span></p>
        <p><span className="text-[#8a8499]">Date: </span><span className="font-semibold">{longDate(letter.date)}</span></p>
      </div>

      {t.toWhom ? (
        <>
          <p className="mt-8 text-center text-[16px] font-bold uppercase tracking-[0.14em]">{subject}</p>
          <p className="mt-6 font-semibold">To whom it may concern</p>
        </>
      ) : (
        <>
          <div className="mt-6">
            <p>To,</p>
            <p className="font-semibold">{values.fullName || "______"}</p>
            {lines(letter.person.address).map((l, i) => <p key={i}>{l}</p>)}
            {letter.person.email && !letter.person.address && <p>{letter.person.email}</p>}
          </div>
          <p className="mt-5"><span className="font-bold">Subject: </span><span className="font-semibold">{subject}</span></p>
        </>
      )}

      <div className="mt-5 space-y-3">
        {blocks.map((b, i) =>
          b.kind === "h" ? (
            <p key={i} className="pt-1 text-[13.5px] font-bold">{rich(b.lines[0])}</p>
          ) : b.kind === "ul" ? (
            <ul key={i} className="list-disc space-y-1 pl-5">{b.lines.map((l, j) => <li key={j}>{rich(l)}</li>)}</ul>
          ) : (
            <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{rich(l)}</Fragment>)}</p>
          ),
        )}
      </div>

      <section className="mt-8 break-inside-avoid">
        {!t.toWhom && <p>Warm regards,</p>}
        <p className="font-semibold">For {head.legalName}</p>
        <div className="mt-2 flex flex-wrap gap-x-10 gap-y-5">
          {(signers.length ? signers : [{ id: "blank", name: "", title: "Authorised signatory", image: "", show: true }]).map((sg) => (
            <div key={sg.id} className="w-[170px]">
              <div className="flex h-14 items-end">{sg.image ? <img src={sg.image} alt="" className="max-h-14 w-auto max-w-full object-contain" /> : null}</div>
              <p className="mt-1 border-t border-[#1d1a26] pt-1 text-[12.5px] font-semibold">{sg.name || " "}</p>
              <p className="text-[11px] text-[#8a8499]">{sg.title || "Authorised signatory"}</p>
            </div>
          ))}
        </div>
      </section>

      {t.acceptance && (
        <section className="mt-8 break-inside-avoid rounded-xl border border-[#d9d5e3] p-4">
          <p className="font-bold">Acceptance</p>
          <p className="mt-1 text-[12.5px]">I have read and understood this letter and accept the terms given in it.</p>
          <div className="mt-8 grid grid-cols-3 gap-6 text-[11.5px] text-[#5b566b]">
            <p className="border-t border-[#1d1a26] pt-1">Signature</p>
            <p className="border-t border-[#1d1a26] pt-1">Name: <span className="font-semibold text-[#1d1a26]">{values.name}</span></p>
            <p className="border-t border-[#1d1a26] pt-1">Date</p>
          </div>
        </section>
      )}

      {t.salary && rows.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <p className="font-bold">Annexure: Salary break-up{values.name ? ` for ${values.name}` : ""}</p>
          <table className="mt-2 w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#f5f3fa] text-left print:bg-[#f5f3fa]">
                <th className="border border-[#d9d5e3] px-3 py-1.5 font-semibold">Component</th>
                <th className="border border-[#d9d5e3] px-3 py-1.5 text-right font-semibold">Monthly</th>
                <th className="border border-[#d9d5e3] px-3 py-1.5 text-right font-semibold">Yearly</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="border border-[#d9d5e3] px-3 py-1.5">{r.label}</td>
                  <td className="border border-[#d9d5e3] px-3 py-1.5 text-right">{rs(r.monthly)}</td>
                  <td className="border border-[#d9d5e3] px-3 py-1.5 text-right">{rs(r.monthly * 12)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-[#d9d5e3] px-3 py-1.5">Total</td>
                <td className="border border-[#d9d5e3] px-3 py-1.5 text-right">{rs(total)}</td>
                <td className="border border-[#d9d5e3] px-3 py-1.5 text-right">{rs(total * 12)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <footer className="mt-auto break-inside-avoid pt-8">
        <div className="flex items-center gap-4 border-t border-[#d9d5e3] pt-3 text-[10.5px] text-[#8a8499]">
          {showVerify && qr ? <img src={qr} alt="" className="h-[18mm] w-[18mm] shrink-0" /> : null}
          <p>
            {showVerify ? (
              <>Verification code <span className="font-mono font-semibold text-[#1d1a26]">{letter.verifyCode}</span>. Check that this letter is genuine at <span className="font-semibold text-[#1d1a26]">{verifyUrl}</span> or by scanning the QR code.</>
            ) : letter.status === "revoked" ? (
              "This letter has been withdrawn by the company and is not valid."
            ) : (
              "Draft. Issue the letter to add its verification code and QR code."
            )}
            <br />
            {[head.legalName, head.gstin && `GSTIN ${head.gstin}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </footer>
    </article>
  );
}

// **bold** inside a line.
function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}
