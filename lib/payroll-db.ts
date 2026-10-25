// Server only. Employees ("employees") and monthly payslips ("payslips").
import { randomBytes, randomInt } from "crypto";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { PAY_MODES, recalc, round, type Employee, type PayRow, type Payslip, type SlipDeduction, type SlipEarning, type SlipStatus } from "./payroll";

export const payOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
export const employeesCol = async () => (await getDb()).collection("employees");

let slipsReady = false;
export async function payslipsCol() {
  const col = (await getDb()).collection("payslips");
  if (!slipsReady) {
    // One payslip per employee per month, so "Make payslips" twice can't make duplicates.
    await col.createIndex({ employeeId: 1, month: 1 }, { unique: true }).catch(() => undefined);
    await col.createIndex({ verifyCode: 1 }, { unique: true, partialFilterExpression: { verifyCode: { $gt: "" } } }).catch(() => undefined);
    await col.createIndex({ month: -1 }).catch(() => undefined);
    slipsReady = true;
  }
  return col;
}

export const newSlipToken = () => randomBytes(18).toString("base64url");
export function newPayslipCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[randomInt(abc.length)];
  return `SPX-P-${s}`;
}

// SPX/PS/2026-10/001: one counter per month.
export async function nextPayslipNumber(month: string, prefix = "SPX") {
  const counters = (await getDb()).collection<{ _id: string; seq: number }>("counters");
  const bump = () => counters.findOneAndUpdate({ _id: `payslip:${month}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  const res = await bump().catch((e) => {
    if ((e as { code?: number }).code === 11000) return bump();
    throw e;
  });
  return `${prefix}/PS/${month}/${String(res?.seq ?? 1).padStart(3, "0")}`;
}

const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
const money = (v: unknown) => Math.max(0, Math.min(1e8, round(Number(v))));
const rowId = (v: unknown, i: number) => s(v, 20).replace(/[^\w-]/g, "") || `r${i}${Math.random().toString(36).slice(2, 6)}`;
const rows = (v: unknown, max = 15): PayRow[] =>
  (Array.isArray(v) ? (v as Record<string, unknown>[]) : []).filter((r) => r && typeof r === "object").slice(0, max).map((r, i) => ({ id: rowId(r.id, i), label: s(r.label, 60), amount: money(r.amount) }));

export function toEmployee(doc: WithId<Document>): Employee {
  const r = doc as WithId<Document> & Partial<Employee>;
  return {
    id: String(doc._id),
    empCode: r.empCode ?? "",
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    designation: r.designation ?? "",
    department: r.department ?? "",
    joiningDate: r.joiningDate ?? "",
    location: r.location ?? "",
    pan: r.pan ?? "",
    uan: r.uan ?? "",
    bankName: r.bankName ?? "",
    bankLast4: r.bankLast4 ?? "",
    active: r.active !== false,
    earnings: Array.isArray(r.earnings) ? r.earnings : [],
    pf: !!r.pf,
    esi: !!r.esi,
    professionalTax: Number(r.professionalTax) || 0,
    tds: Number(r.tds) || 0,
    otherDeductions: Array.isArray(r.otherDeductions) ? r.otherDeductions : [],
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  };
}

export function cleanEmployeeInput(b: Record<string, unknown>) {
  const out: Partial<Employee> = {};
  const text: [keyof Employee, number][] = [["empCode", 30], ["name", 120], ["email", 160], ["phone", 30], ["designation", 100], ["department", 80], ["location", 80], ["uan", 20], ["bankName", 80]];
  for (const [k, max] of text) if (b[k] !== undefined) (out as Record<string, unknown>)[k] = s(b[k], max);
  if (b.email !== undefined) out.email = s(b.email, 160).toLowerCase();
  if (b.pan !== undefined) out.pan = s(b.pan, 10).toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Only the last 4 digits of the bank account are kept.
  if (b.bankLast4 !== undefined) out.bankLast4 = s(b.bankLast4, 40).replace(/\D/g, "").slice(-4);
  if (b.joiningDate !== undefined) out.joiningDate = date(b.joiningDate);
  if (b.active !== undefined) out.active = !!b.active;
  if (b.pf !== undefined) out.pf = !!b.pf;
  if (b.esi !== undefined) out.esi = !!b.esi;
  if (b.professionalTax !== undefined) out.professionalTax = money(b.professionalTax);
  if (b.tds !== undefined) out.tds = money(b.tds);
  if (b.earnings !== undefined) out.earnings = rows(b.earnings);
  if (b.otherDeductions !== undefined) out.otherDeductions = rows(b.otherDeductions, 8);
  return out;
}

export function toPayslip(doc: WithId<Document>): Payslip {
  const r = doc as WithId<Document> & Partial<Payslip>;
  return {
    id: String(doc._id),
    month: r.month ?? "",
    employeeId: r.employeeId ?? "",
    emp: { empCode: "", name: "", email: "", designation: "", department: "", joiningDate: "", location: "", pan: "", uan: "", bankName: "", bankLast4: "", ...(r.emp ?? {}) },
    daysInMonth: Number(r.daysInMonth) || 30,
    paidDays: Number(r.paidDays ?? r.daysInMonth) || 0,
    earnings: Array.isArray(r.earnings) ? r.earnings : [],
    deductions: Array.isArray(r.deductions) ? r.deductions : [],
    esiOn: !!r.esiOn,
    paymentDate: r.paymentDate ?? "",
    paymentMode: r.paymentMode ?? "Bank transfer",
    note: r.note ?? "",
    number: r.number ?? "",
    verifyCode: r.verifyCode ?? "",
    token: r.token ?? "",
    status: (["draft", "issued", "revoked"].includes(String(r.status)) ? r.status : "draft") as SlipStatus,
    issuedAt: r.issuedAt ?? "",
    sentAt: r.sentAt ?? "",
    createdBy: r.createdBy ?? "",
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  };
}

// What the payslip editor may change. Amounts are worked out again on the server.
export function cleanSlipInput(b: Record<string, unknown>, current: Payslip): Payslip {
  const next: Payslip = { ...current };
  if (b.paidDays !== undefined) next.paidDays = Math.max(0, Math.min(current.daysInMonth, Math.round(Number(b.paidDays) * 2) / 2 || 0));
  if (Array.isArray(b.earnings)) {
    next.earnings = (b.earnings as Record<string, unknown>[]).filter((r) => r && typeof r === "object").slice(0, 15).map((r, i): SlipEarning => ({
      id: rowId(r.id, i), label: s(r.label, 60), full: money(r.full ?? r.amount), amount: money(r.amount), prorate: !!r.prorate,
    })).filter((r) => r.label);
  }
  if (Array.isArray(b.deductions)) {
    next.deductions = (b.deductions as Record<string, unknown>[]).filter((r) => r && typeof r === "object").slice(0, 15).map((r, i): SlipDeduction => ({
      id: rowId(r.id, i), label: s(r.label, 60), amount: money(r.amount), auto: r.auto === "pf" || r.auto === "esi" ? r.auto : "",
    })).filter((r) => r.label);
  }
  if (b.esiOn !== undefined) next.esiOn = !!b.esiOn;
  if (b.paymentDate !== undefined) next.paymentDate = date(b.paymentDate);
  if (b.paymentMode !== undefined) next.paymentMode = PAY_MODES.includes(String(b.paymentMode)) ? String(b.paymentMode) : "Bank transfer";
  if (b.note !== undefined) next.note = s(b.note, 300);
  if (b.emp && typeof b.emp === "object") {
    const e = b.emp as Record<string, unknown>;
    next.emp = {
      ...current.emp,
      ...Object.fromEntries((["empCode", "name", "designation", "department", "location", "uan", "bankName"] as const).filter((k) => e[k] !== undefined).map((k) => [k, s(e[k], 120)])),
      ...(e.email !== undefined ? { email: s(e.email, 160).toLowerCase() } : {}),
      ...(e.pan !== undefined ? { pan: s(e.pan, 10).toUpperCase().replace(/[^A-Z0-9]/g, "") } : {}),
      ...(e.bankLast4 !== undefined ? { bankLast4: s(e.bankLast4, 40).replace(/\D/g, "").slice(-4) } : {}),
      ...(e.joiningDate !== undefined ? { joiningDate: date(e.joiningDate) } : {}),
    };
  }
  return recalc(next);
}
