import type { Letterhead } from "@/lib/letters";
import { monthLabel, slipTotals, type Payslip } from "@/lib/payroll";
import { LETTER_FONT, letterFontVars } from "@/components/letters/fonts";

// One payslip on one A4 page, on the same letterhead as HR letters. Used in the admin preview, the PDF and the employee's link.
const ACCENT = "#5b45c9";
const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const longDate = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "");

export default function PayslipDocument({ slip, head, logo, qr, verifyUrl }: { slip: Payslip; head: Letterhead; logo?: string; qr?: string; verifyUrl: string }) {
  const t = slipTotals(slip);
  const lop = Math.max(0, slip.daysInMonth - slip.paidDays);
  const lines = (v: string) => String(v || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const contact = [head.phone, head.email, head.website].filter(Boolean);
  const showVerify = slip.status === "issued" && !!slip.verifyCode;
  const e = slip.emp;
  const details: [string, string][] = [
    ["Employee name", e.name],
    ["Employee ID", e.empCode],
    ["Designation", e.designation],
    ["Department", e.department],
    ["Date of joining", longDate(e.joiningDate)],
    ["Work location", e.location],
    ["PAN", e.pan],
    ["UAN (PF)", e.uan],
    ["Bank", [e.bankName, e.bankLast4 && `A/c XXXX${e.bankLast4}`].filter(Boolean).join(" · ")],
    ["Pay date", [longDate(slip.paymentDate), slip.paymentDate ? slip.paymentMode : ""].filter(Boolean).join(" · ")],
  ];
  const shown = details.filter(([, v]) => v);
  const earnings = slip.earnings.filter((r) => r.label && (r.amount > 0 || r.full > 0));
  const deductions = slip.deductions.filter((r) => r.label && r.amount > 0);
  const n = Math.max(earnings.length, deductions.length, 1);
  const cell = "border border-[#e1ddef] px-3 py-1.5";

  return (
    <article style={{ fontFamily: LETTER_FONT, fontKerning: "normal", letterSpacing: 0, wordSpacing: "0.04em", textRendering: "geometricPrecision", WebkitFontSmoothing: "antialiased" }}
      className={`${letterFontVars} letter-page relative mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col overflow-hidden bg-white px-[16mm] pb-[10mm] pt-[12mm] text-[12px] leading-[1.5] text-[#1d1a26] shadow-[0_20px_60px_-30px_rgba(18,15,27,.45)] print:min-h-[262mm] print:max-w-none print:overflow-visible print:p-0 print:shadow-none`}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-[5px] print:hidden" style={{ background: `linear-gradient(90deg, ${ACCENT}, #9d8cf0)` }} />
      {slip.status !== "issued" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className={`rotate-[-28deg] rounded-xl border-4 px-8 py-2 text-7xl font-bold uppercase tracking-[0.2em] ${slip.status === "revoked" ? "border-red-500/30 text-red-500/25" : "border-[#1d1a26]/10 text-[#1d1a26]/10"}`}>
            {slip.status === "revoked" ? "Revoked" : "Draft"}
          </span>
        </div>
      )}

      <header className="flex items-center justify-between gap-6 pb-3" style={{ borderBottom: `1.5px solid ${ACCENT}` }}>
        <div className="flex min-w-0 items-center gap-3">
          {logo ? <img src={logo} alt="" className="h-11 w-auto max-w-[110px] object-contain" /> : null}
          <div className="min-w-0">
            <p className="text-[18px] font-bold leading-tight tracking-[-0.01em]">{head.legalName}</p>
            {lines(head.address).length > 0 && <p className="text-[10.5px] leading-snug text-[#6b6680]">{lines(head.address).join(", ")}</p>}
          </div>
        </div>
        {contact.length > 0 && <div className="shrink-0 text-right text-[10.5px] leading-[1.55] text-[#6b6680]">{contact.map((c) => <p key={c}>{c}</p>)}</div>}
      </header>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Payslip</p>
          <h1 className="text-[22px] font-bold leading-tight">{monthLabel(slip.month)}</h1>
        </div>
        {slip.number && <p className="text-right text-[11.5px]"><span className="text-[#8a8499]">No. </span><span className="font-semibold">{slip.number}</span></p>}
      </div>

      <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 rounded-lg border border-[#e1ddef] bg-[#faf9fd] px-4 py-3 print:bg-[#faf9fd]">
        {shown.map(([k, v]) => (
          <p key={k} className="flex min-w-0 gap-2"><span className="w-[105px] shrink-0 text-[#8a8499]">{k}</span><span className="min-w-0 truncate font-semibold">{v}</span></p>
        ))}
      </section>

      <section className={`mt-3 grid gap-3 text-center ${slip.attendance ? "grid-cols-4" : "grid-cols-3"}`}>
        {[["Days in month", String(slip.daysInMonth)], ["Paid days", String(slip.paidDays)], ...(slip.attendance ? [["Paid leave", String(slip.attendance.paidLeave)]] : []), ["Leave without pay", String(lop)]].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-[#e1ddef] px-3 py-2"><p className="text-[10.5px] text-[#8a8499]">{k}</p><p className="text-[15px] font-bold tabular-nums">{v}</p></div>
        ))}
      </section>

      <table className="mt-4 w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="bg-[#f4f2fb] text-left print:bg-[#f4f2fb]">
            <th className={`${cell} font-semibold`}>Earnings</th>
            <th className={`${cell} w-[19%] text-right font-semibold`}>Amount</th>
            <th className={`${cell} font-semibold`}>Deductions</th>
            <th className={`${cell} w-[19%] text-right font-semibold`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => {
            const a = earnings[i];
            const d = deductions[i];
            return (
              <tr key={i}>
                <td className={cell}>{a ? <>{a.label}{a.prorate && a.amount !== a.full ? <span className="text-[10px] text-[#8a8499]"> (of {rs(a.full)})</span> : null}</> : i === 0 ? "" : ""}</td>
                <td className={`${cell} text-right tabular-nums`}>{a ? rs(a.amount) : ""}</td>
                <td className={cell}>{d ? d.label : i === 0 ? <span className="text-[#8a8499]">None</span> : ""}</td>
                <td className={`${cell} text-right tabular-nums`}>{d ? rs(d.amount) : ""}</td>
              </tr>
            );
          })}
          <tr className="font-bold">
            <td className={cell}>Gross earnings</td>
            <td className={`${cell} text-right tabular-nums`}>{rs(t.gross)}</td>
            <td className={cell}>Total deductions</td>
            <td className={`${cell} text-right tabular-nums`}>{rs(t.deductions)}</td>
          </tr>
        </tbody>
      </table>

      <section className="mt-4 flex items-center justify-between gap-6 rounded-xl px-5 py-4 text-white print:bg-[#1d1a26]" style={{ background: "#1d1a26" }}>
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#c9c0f5]">Net pay</p>
          <p className="mt-0.5 text-[11.5px] text-white/80">{t.words}</p>
        </div>
        <p className="shrink-0 text-[26px] font-bold tabular-nums">{rs(t.net)}</p>
      </section>
      <p className="mt-1.5 text-[10.5px] text-[#8a8499]">Net pay = Gross earnings {rs(t.gross)} − Total deductions {rs(t.deductions)}</p>
      {slip.note && <p className="mt-3 rounded-lg bg-[#faf9fd] px-4 py-2 text-[11.5px] print:bg-[#faf9fd]"><span className="font-semibold">Note: </span>{slip.note}</p>}

      <footer className="mt-auto break-inside-avoid pt-5">
        <p className="mb-2 text-[10.5px] text-[#6b6680]">This is a computer-generated payslip and does not need a signature.</p>
        <div className="flex items-center gap-3 border-t border-[#e1ddef] pt-2.5 text-[9.5px] leading-[1.5] text-[#8a8499]">
          {showVerify && qr ? <img src={qr} alt="" className="h-[14mm] w-[14mm] shrink-0" /> : null}
          <p className="min-w-0 flex-1">
            {showVerify ? (
              <>Verify this payslip at <span className="font-semibold text-[#1d1a26]">{verifyUrl}</span> with code <span className="font-mono font-semibold text-[#1d1a26]">{slip.verifyCode}</span>, or scan the QR code.</>
            ) : slip.status === "revoked" ? "This payslip has been withdrawn by the company and is not valid." : "Draft. Issue the payslip to add its verification code and QR code."}
          </p>
          <p className="shrink-0 text-right">{[head.legalName, head.gstin && `GSTIN ${head.gstin}`].filter(Boolean).join(" · ")}</p>
        </div>
      </footer>
    </article>
  );
}
