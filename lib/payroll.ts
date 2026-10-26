// Payroll: employees with their monthly salary structure, and monthly payslips. Shared by server and admin screens.
import { amountInWords } from "./billing";

export type PayRow = { id: string; label: string; amount: number };

export type Employee = {
  id: string;
  empCode: string; // e.g. SPX-E-007
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  joiningDate: string;
  exitDate?: string; // last working day, once they leave
  location: string;
  pan: string;
  uan: string; // PF number
  bankName: string;
  bankLast4: string; // only the last 4 digits are kept and printed
  active: boolean;
  earnings: PayRow[]; // full monthly amounts: Basic, HRA, Special allowance…
  pf: boolean; // employee PF, 12% of basic (basic counted up to ₹15,000)
  esi: boolean; // employee ESI, 0.75% of gross, when full gross is ₹21,000 or less
  professionalTax: number; // per month (Rajasthan has none; other states differ)
  tds: number; // income tax deducted per month
  otherDeductions: PayRow[]; // fixed every month, e.g. canteen
  createdAt: string;
  updatedAt: string;
};

export type SlipStatus = "draft" | "issued" | "revoked";
// Earnings: "full" is the monthly rate; prorated ones are paid for the days worked. Extras (bonus, overtime) are not.
export type SlipEarning = PayRow & { full: number; prorate: boolean };
export type SlipDeduction = PayRow & { auto?: "pf" | "esi" | "" };

export type Payslip = {
  id: string;
  month: string; // YYYY-MM
  employeeId: string;
  emp: Pick<Employee, "empCode" | "name" | "email" | "designation" | "department" | "joiningDate" | "location" | "pan" | "uan" | "bankName" | "bankLast4">;
  daysInMonth: number;
  paidDays: number;
  earnings: SlipEarning[];
  deductions: SlipDeduction[];
  esiOn: boolean;
  // From Attendance and leave when the payslip was made (or refreshed); null = paid days typed by hand.
  attendance: { present: number; half: number; absent: number; paidLeave: number; unpaidLeave: number; lop: number } | null;
  paymentDate: string;
  paymentMode: string; // Bank transfer, UPI, Cash, Cheque
  note: string;
  number: string;
  verifyCode: string;
  token: string;
  status: SlipStatus;
  issuedAt: string;
  sentAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export const slipStatusLabel: Record<SlipStatus, string> = { draft: "Draft", issued: "Issued", revoked: "Revoked" };
export const PAY_MODES = ["Bank transfer", "UPI", "Cheque", "Cash"];

const rid = () => Math.random().toString(36).slice(2, 10);
export const round = (n: number) => Math.round(Number(n) || 0);

export const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
};
export const validMonth = (v: unknown) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v ?? ""));
export const lastMonth = () => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

export const blankEmployee = (): Omit<Employee, "id" | "createdAt" | "updatedAt"> => ({
  empCode: "",
  name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  joiningDate: "",
  exitDate: "",
  location: "Jaipur",
  pan: "",
  uan: "",
  bankName: "",
  bankLast4: "",
  active: true,
  earnings: [
    { id: rid(), label: "Basic", amount: 0 },
    { id: rid(), label: "House rent allowance (HRA)", amount: 0 },
    { id: rid(), label: "Special allowance", amount: 0 },
  ],
  pf: false,
  esi: false,
  professionalTax: 0,
  tds: 0,
  otherDeductions: [],
});

// Splits a monthly gross into the usual parts: Basic 50%, HRA 40% of basic, the rest special allowance.
export function splitGross(gross: number): PayRow[] {
  const g = Math.max(0, round(gross));
  const basic = round(g * 0.5);
  const hra = round(basic * 0.4);
  return [
    { id: rid(), label: "Basic", amount: basic },
    { id: rid(), label: "House rent allowance (HRA)", amount: hra },
    { id: rid(), label: "Special allowance", amount: g - basic - hra },
  ];
}

export const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
export const fullGross = (e: Pick<Employee, "earnings">) => sum(e.earnings);
// PF wage = Basic + Dearness allowance (DA), as the PF Act counts it.
const isBasic = (label: string) => /^basic/i.test(label.trim()) || /dearness|^da\b|\(da\)/i.test(label.trim());

// PF on basic + DA (up to the ₹15,000 wage ceiling) and ESI on gross, recalculated whenever days or amounts change.
export function recalc(slip: Payslip): Payslip {
  const ratio = slip.daysInMonth > 0 ? Math.min(1, Math.max(0, slip.paidDays / slip.daysInMonth)) : 1;
  const earnings = slip.earnings.map((r) => (r.prorate ? { ...r, amount: round(r.full * ratio) } : { ...r, amount: round(r.amount) }));
  const basic = sum(earnings.filter((r) => isBasic(r.label)));
  const gross = sum(earnings);
  const deductions = slip.deductions.map((d) => {
    if (d.auto === "pf") return { ...d, amount: round(Math.min(basic, 15000) * 0.12) };
    if (d.auto === "esi") return { ...d, amount: slip.esiOn ? Math.ceil(gross * 0.0075) : 0 };
    return { ...d, amount: round(d.amount) };
  });
  return { ...slip, earnings, deductions };
}

export function slipTotals(slip: Pick<Payslip, "earnings" | "deductions">) {
  const gross = sum(slip.earnings);
  const deductions = sum(slip.deductions);
  const net = Math.max(0, gross - deductions);
  return { gross, deductions, net, words: amountInWords(net) };
}

// A new month's slip from the employee's structure (full month paid; change paid days for leave without pay).
export function draftSlip(e: Employee, month: string): Omit<Payslip, "id" | "number" | "verifyCode" | "token" | "createdBy" | "createdAt" | "updatedAt"> {
  const days = daysIn(month);
  const deductions: SlipDeduction[] = [];
  if (e.pf) deductions.push({ id: rid(), label: "Provident fund (PF)", amount: 0, auto: "pf" });
  if (e.esi) deductions.push({ id: rid(), label: "ESI", amount: 0, auto: "esi" });
  if (e.professionalTax > 0) deductions.push({ id: rid(), label: "Professional tax", amount: e.professionalTax, auto: "" });
  if (e.tds > 0) deductions.push({ id: rid(), label: "Income tax (TDS)", amount: e.tds, auto: "" });
  for (const d of e.otherDeductions) if (d.label.trim() && d.amount > 0) deductions.push({ id: rid(), label: d.label, amount: d.amount, auto: "" });
  const base = {
    month,
    employeeId: e.id,
    emp: { empCode: e.empCode, name: e.name, email: e.email, designation: e.designation, department: e.department, joiningDate: e.joiningDate, location: e.location, pan: e.pan, uan: e.uan, bankName: e.bankName, bankLast4: e.bankLast4 },
    daysInMonth: days,
    paidDays: days,
    earnings: e.earnings.filter((r) => r.label.trim()).map((r) => ({ id: rid(), label: r.label, full: round(r.amount), amount: round(r.amount), prorate: true })),
    deductions,
    // ESI applies when the full monthly gross is ₹21,000 or less.
    esiOn: e.esi && fullGross(e) <= 21000,
    attendance: null,
    paymentDate: "",
    paymentMode: "Bank transfer",
    note: "",
    status: "draft" as SlipStatus,
    issuedAt: "",
    sentAt: "",
  };
  return recalc(base as Payslip);
}

export const isPayslipCode = (v: string) => /^SPX-P-[A-Z0-9]{6}$/.test(v);
export const maskPan = (pan: string) => (pan.length >= 10 ? `${pan.slice(0, 2)}XXXXX${pan.slice(-3)}` : pan);

// Paid days from the month's attendance: days in the month minus days of pay lost (absent, unpaid leave, half days, before joining).
export function withAttendance<T extends Pick<Payslip, "daysInMonth" | "paidDays" | "attendance">>(slip: T, a: { present: number; half: number; absent: number; paidLeave: number; unpaidLeave: number; lop: number }): T {
  const attendance = { present: a.present, half: a.half, absent: a.absent, paidLeave: a.paidLeave, unpaidLeave: a.unpaidLeave, lop: a.lop };
  return { ...slip, attendance, paidDays: Math.max(0, slip.daysInMonth - a.lop) };
}
