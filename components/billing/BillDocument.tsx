import { amountInWords, computeTotals, docSigners, docTitle, inr, statusLabel, STATE_CODES, type BillDoc, type BillingProfile } from "@/lib/billing";

// One A4 page for a quotation or invoice. Used in the admin editor preview, the print / PDF view
// and the client's view-only link. Plain markup only, so it prints the same everywhere.
export default function BillDocument({ doc, profile, logo }: { doc: BillDoc; profile: BillingProfile; logo?: string }) {
  const t = computeTotals(doc, profile);
  const signers = docSigners(doc, profile);
  const title = docTitle(doc.type, t.gstOn);
  const fmt = (d: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
  const lines = (s: string) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const placeCode = STATE_CODES[doc.client.state] ? ` (${STATE_CODES[doc.client.state]})` : "";
  const showSac = doc.items.some((i) => i.sac);
  const showGstCol = t.gstOn;
  const bank = [
    ["Bank", profile.bankName], ["Account name", profile.accountName], ["Account no.", profile.accountNumber], ["IFSC", profile.ifsc], ["UPI", profile.upi],
  ].filter(([, v]) => v);
  const upiLink = profile.upi && doc.type === "invoice" && t.balance > 0
    ? `upi://pay?pa=${encodeURIComponent(profile.upi)}&pn=${encodeURIComponent(profile.legalName)}&am=${t.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent(doc.number)}`
    : "";

  return (
    <article className="bill-page relative mx-auto w-full max-w-[210mm] bg-white p-[12mm] text-[12.5px] leading-[1.5] text-[#1d1a26] shadow-[0_20px_60px_-30px_rgba(18,15,27,.45)] print:max-w-none print:p-0 print:shadow-none">
      {doc.status === "cancelled" && <div className="pointer-events-none absolute inset-0 grid place-items-center"><span className="rotate-[-24deg] rounded-xl border-4 border-red-500/40 px-6 py-2 text-6xl font-bold uppercase tracking-widest text-red-500/30">Cancelled</span></div>}

      <header className="flex items-start justify-between gap-6 border-b-2 border-[#1d1a26] pb-5">
        <div className="max-w-[55%]">
          {logo ? <img src={logo} alt={profile.legalName} className="mb-3 h-12 w-auto object-contain" /> : null}
          <p className="text-[17px] font-bold">{profile.legalName}</p>
          {lines(profile.address).map((l, i) => <p key={i} className="text-[#5b566b]">{l}</p>)}
          <p className="text-[#5b566b]">{[profile.phone, profile.email, profile.website].filter(Boolean).join(" · ")}</p>
          {(profile.gstin || profile.pan) && <p className="mt-1 font-semibold">{[profile.gstin && `GSTIN: ${profile.gstin}`, profile.pan && `PAN: ${profile.pan}`].filter(Boolean).join("   ")}</p>}
        </div>
        <div className="text-right">
          <p className="text-[26px] font-bold uppercase tracking-[0.06em]">{title}</p>
          <table className="ml-auto mt-2 text-[12px]">
            <tbody>
              <Meta label={doc.type === "quote" ? "Quote no." : "Invoice no."} value={doc.number} bold />
              <Meta label="Date" value={fmt(doc.date)} />
              {doc.dueDate && <Meta label={doc.type === "quote" ? "Valid till" : "Due date"} value={fmt(doc.dueDate)} />}
              {doc.fromQuoteNumber && <Meta label="Against quote" value={doc.fromQuoteNumber} />}
              {doc.type === "invoice" && doc.status !== "unpaid" && <Meta label="Status" value={statusLabel[doc.status]} />}
            </tbody>
          </table>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8499]">{doc.type === "quote" ? "Prepared for" : "Bill to"}</p>
          <p className="mt-1 text-[14px] font-bold">{doc.client.company || doc.client.name || "—"}</p>
          {doc.client.company && doc.client.name && <p>{doc.client.name}</p>}
          {lines(doc.client.address).map((l, i) => <p key={i} className="text-[#5b566b]">{l}</p>)}
          <p className="text-[#5b566b]">{[doc.client.phone, doc.client.email].filter(Boolean).join(" · ")}</p>
          {doc.client.gstin && <p className="mt-1 font-semibold">GSTIN: {doc.client.gstin}</p>}
        </div>
        {t.gstOn && doc.client.state && (
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8499]">Place of supply</p>
            <p className="mt-1 font-semibold">{doc.client.state}{placeCode}</p>
            <p className="text-[#5b566b]">{t.exportSupply ? "Export of services, zero-rated (supply under LUT, no GST charged)" : t.interState ? "IGST applies (other state)" : "CGST + SGST apply (same state)"}</p>
          </div>
        )}
      </section>

      <table className="mt-6 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#1d1a26] text-left text-white">
            <th className="w-8 px-2 py-2 font-semibold">#</th>
            <th className="px-2 py-2 font-semibold">Description</th>
            {showSac && <th className="px-2 py-2 font-semibold">SAC</th>}
            <th className="px-2 py-2 text-right font-semibold">Qty</th>
            <th className="px-2 py-2 text-right font-semibold">Rate</th>
            {showGstCol && <th className="px-2 py-2 text-right font-semibold">GST</th>}
            <th className="px-2 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={it.id} className="break-inside-avoid border-b border-[#e6e2ef] align-top">
              <td className="px-2 py-2.5 text-[#8a8499]">{i + 1}</td>
              <td className="whitespace-pre-line px-2 py-2.5">{it.description || "—"}</td>
              {showSac && <td className="px-2 py-2.5 text-[#5b566b]">{it.sac}</td>}
              <td className="px-2 py-2.5 text-right">{it.qty}</td>
              <td className="px-2 py-2.5 text-right">{inr(it.rate)}</td>
              {showGstCol && <td className="px-2 py-2.5 text-right">{it.gst}%</td>}
              <td className="px-2 py-2.5 text-right font-semibold">{inr(t.lines.find((l) => l.id === it.id)?.amount ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-4 grid grid-cols-[1fr_auto] gap-8">
        <div className="pt-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8499]">Amount in words</p>
          <p className="mt-1 font-semibold">{amountInWords(t.total)}</p>
          {doc.type === "invoice" && doc.status === "paid" && <p className="mt-4"><span className="inline-block rotate-[-8deg] rounded-lg border-[3px] border-emerald-600/60 px-4 py-1 text-2xl font-bold uppercase tracking-widest text-emerald-700/70">Paid</span></p>}
          {t.gstOn && t.tax > 0 && (
            <table className="mt-4 text-[11.5px]">
              <thead>
                <tr className="text-left text-[#8a8499]">
                  <th className="pr-4 font-semibold">GST rate</th><th className="pr-4 text-right font-semibold">Taxable</th>
                  {t.interState ? <th className="text-right font-semibold">IGST</th> : <><th className="pr-4 text-right font-semibold">CGST</th><th className="text-right font-semibold">SGST</th></>}
                </tr>
              </thead>
              <tbody>
                {t.byRate.filter((r) => r.rate > 0).map((r) => (
                  <tr key={r.rate}>
                    <td className="pr-4">{r.rate}%</td><td className="pr-4 text-right">{inr(r.taxable)}</td>
                    {t.interState ? <td className="text-right">{inr(r.igst)}</td> : <><td className="pr-4 text-right">{inr(r.cgst)}</td><td className="text-right">{inr(r.sgst)}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <table className="min-w-[230px] text-[12.5px]">
          <tbody>
            <Sum label="Subtotal" value={inr(t.subtotal)} />
            {t.discount > 0 && <Sum label="Discount" value={`− ${inr(t.discount)}`} />}
            {t.discount > 0 && <Sum label="Taxable value" value={inr(t.taxable)} />}
            {t.gstOn && (t.interState ? <Sum label="IGST" value={inr(t.igst)} /> : <><Sum label="CGST" value={inr(t.cgst)} /><Sum label="SGST" value={inr(t.sgst)} /></>)}
            {t.roundOff !== 0 && <Sum label="Round off" value={`${t.roundOff > 0 ? "+" : "−"} ${inr(Math.abs(t.roundOff))}`} />}
            <tr className="border-t-2 border-[#1d1a26]"><td className="py-2 pr-6 text-[14px] font-bold">Total</td><td className="py-2 text-right text-[16px] font-bold">{inr(t.total)}</td></tr>
            {doc.type === "invoice" && doc.paid > 0 && <Sum label="Received" value={`− ${inr(doc.paid)}`} />}
            {doc.type === "invoice" && doc.paid > 0 && <tr><td className="py-1 pr-6 font-bold">Balance due</td><td className="py-1 text-right font-bold">{inr(t.balance)}</td></tr>}
          </tbody>
        </table>
      </section>

      {doc.notes && (
        <section className="mt-6 break-inside-avoid rounded-xl bg-[#f5f3fa] p-4 print:bg-[#f5f3fa]">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8499]">Notes</p>
          <p className="mt-1 whitespace-pre-line">{doc.notes}</p>
        </section>
      )}

      <section className="mt-6 grid break-inside-avoid grid-cols-2 gap-6">
        <div className="col-span-2 grid grid-cols-2 gap-6">
          {doc.type === "invoice" && bank.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8499]">Payment details</p>
              <table className="mt-1 text-[12px]"><tbody>{bank.map(([k, v]) => <tr key={k}><td className="pr-3 text-[#5b566b]">{k}</td><td className="font-semibold">{v}</td></tr>)}</tbody></table>
              {upiLink && <p className="mt-2 text-[11.5px] text-[#5b566b] print:hidden">On a phone? <a href={upiLink} className="font-semibold text-[#5745b5] underline">Pay {inr(t.balance, 0)} by UPI</a></p>}
            </div>
          )}
          {lines(doc.terms).length > 0 && (
            <div className={doc.type === "invoice" && bank.length ? "" : "col-span-2"}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8499]">Terms</p>
              <ol className="mt-1 list-decimal pl-4 text-[11.5px] text-[#5b566b]">{lines(doc.terms).map((l, i) => <li key={i}>{l}</li>)}</ol>
            </div>
          )}
        </div>
      </section>

      {doc.type === "quote" && doc.acceptance && (
        <section className="mt-6 break-inside-avoid rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-[12px] text-emerald-900 print:bg-emerald-50">
          <p className="font-bold">Accepted online by {doc.acceptance.name}</p>
          <p>
            {new Date(doc.acceptance.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST
            {doc.acceptance.ip ? ` · IP ${doc.acceptance.ip}` : ""}
            {doc.acceptance.total ? ` · ₹${doc.acceptance.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""}
          </p>
          {doc.acceptance.note && <p className="mt-1">Note: {doc.acceptance.note}</p>}
        </section>
      )}

      <section className="mt-8 break-inside-avoid">
        <p className="text-right font-semibold">For {profile.legalName}</p>
        <div className="mt-2 flex flex-wrap justify-end gap-x-8 gap-y-5">
          {(signers.length ? signers : [{ id: "blank", name: "", title: "Authorised signatory", image: "", show: true }]).map((sg) => (
            <div key={sg.id} className="w-[150px] text-center">
              <div className="flex h-14 items-end justify-center">{sg.image ? <img src={sg.image} alt="" className="max-h-14 w-auto max-w-full object-contain" /> : null}</div>
              <p className="mt-1 border-t border-[#1d1a26] pt-1 text-[12px] font-semibold">{sg.name || "\u00a0"}</p>
              <p className="text-[10.5px] text-[#8a8499]">{sg.title || "Authorised signatory"}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function Meta({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <tr><td className="pr-3 text-right text-[#8a8499]">{label}</td><td className={`text-right ${bold ? "font-bold" : "font-medium"}`}>{value}</td></tr>;
}

function Sum({ label, value }: { label: string; value: string }) {
  return <tr><td className="py-1 pr-6 text-[#5b566b]">{label}</td><td className="py-1 text-right">{value}</td></tr>;
}
