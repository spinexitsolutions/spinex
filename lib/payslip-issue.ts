// Server only. Issuing and emailing payslips (one at a time or a whole month).
import { getLetterhead } from "./letter-db";
import { emailPerson } from "./notify";
import { monthLabel, slipTotals, type Payslip } from "./payroll";
import { newPayslipCode, nextPayslipNumber, payOid, payslipsCol, toPayslip } from "./payroll-db";
import { getLetterSettings } from "./letter-db";
import { inr } from "./billing";

// Draft → issued: gets its number (SPX/PS/2026-10/001) and verification code. Already issued: unchanged.
export async function issueSlip(slip: Payslip) {
  if (slip.status === "issued") return slip;
  if (slip.status === "revoked") throw new Error("This payslip is revoked. Make it a draft again first.");
  if (!slip.emp.name.trim()) throw new Error("Add the employee's name first.");
  const col = await payslipsCol();
  const _id = payOid(slip.id)!;
  const { prefix } = await getLetterSettings();
  const number = slip.number || (await nextPayslipNumber(slip.month, prefix));
  const stamp = new Date().toISOString();
  for (let i = 0; i < 5; i++) {
    try {
      const doc = await col.findOneAndUpdate(
        { _id, status: "draft" },
        { $set: { status: "issued", number, verifyCode: slip.verifyCode || newPayslipCode(), issuedAt: slip.issuedAt || stamp, updatedAt: stamp } },
        { returnDocument: "after" },
      );
      if (doc) return toPayslip(doc);
      const now = await col.findOne({ _id });
      if (now) return toPayslip(now); // someone else issued it a moment ago
      throw new Error("Payslip not found.");
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e; // verify code clash: try another
    }
  }
  throw new Error("Couldn't issue the payslip. Try again.");
}

export async function emailSlip(slip: Payslip, origin: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(slip.emp.email)) return { ok: false, error: `No email for ${slip.emp.name || "this employee"}.` };
  const head = await getLetterhead();
  const t = slipTotals(slip);
  const month = monthLabel(slip.month);
  const ok = await emailPerson(
    slip.emp.email,
    `Payslip for ${month} - ${head.legalName}`,
    `Your payslip for ${month}`,
    [`Hi ${slip.emp.name.split(/\s+/)[0] || "there"},`, `Your payslip for ${month} is ready. Net pay: ${inr(t.net, 0)}.`, "You can view it and download it as a PDF from the button below. Please keep it safe; you may need it for loans, visas or tax returns.", `Team ${head.legalName}`],
    { label: "View payslip", url: `${origin}/p/${slip.token}` },
  );
  if (!ok) return { ok: false, error: "The email couldn't be sent. Check Admin → API keys → Email alerts." };
  await (await payslipsCol()).updateOne({ _id: payOid(slip.id)! }, { $set: { sentAt: new Date().toISOString() } });
  return { ok: true };
}
