import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { clientIp, rateLimited } from "@/lib/antispam";
import { notifyAdmin } from "@/lib/notify";
import { sendWhatsAppAlert } from "@/lib/whatsapp-alert";
import { getContent } from "@/lib/content-server";
import { getStaffSession } from "@/lib/staff-auth";
import { isJsonRequest, originOf } from "@/lib/portal-db";
import { addDay, leaveBalance, leaveDays, rangeText, todayIST } from "@/lib/leave";
import { getAttendanceSettings, leavesCol, overlappingLeave, toLeave } from "@/lib/leave-db";

const isDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ""));

// The employee applies for leave: { type, from, to, half, reason }. It waits for approval.
export async function POST(req: Request) {
  const emp = await getStaffSession();
  if (!emp) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (await rateLimited(`staff-leave:${emp.id}:${clientIp(req)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many requests. Please wait a while." }, { status: 429 });
  const b = await jsonBody(req);
  const s = await getAttendanceSettings();
  const type = s.leaveTypes.find((t) => t.id === b.type);
  if (!type) return NextResponse.json({ error: "Choose the type of leave." }, { status: 400 });
  const from = String(b.from ?? "");
  const to = isDate(b.to) ? String(b.to) : from;
  if (!isDate(from) || to < from) return NextResponse.json({ error: "Choose the dates (the last day can't be before the first)." }, { status: 400 });
  const today = todayIST();
  if (from < addDay(today, -30)) return NextResponse.json({ error: "Leave older than 30 days can't be applied here. Ask HR." }, { status: 400 });
  if (to > addDay(from, 59)) return NextResponse.json({ error: "One request can be up to 60 days. Apply in parts or ask HR." }, { status: 400 });
  if (emp.joiningDate && from < emp.joiningDate) return NextResponse.json({ error: "Leave can't start before your joining date." }, { status: 400 });
  const half = !!b.half && from === to;
  const days = leaveDays(s, from, to, half);
  if (!days) return NextResponse.json({ error: "These days are weekly offs or holidays, so no leave is needed." }, { status: 400 });
  const reason = String(b.reason ?? "").trim().slice(0, 500);
  if (!reason) return NextResponse.json({ error: "Add a short reason." }, { status: 400 });
  const clash = await overlappingLeave(emp.id, from, to);
  if (clash) return NextResponse.json({ error: `You already have leave on these days (${rangeText(clash.from, clash.to, clash.half)}, ${clash.status === "pending" ? "waiting" : "approved"}).` }, { status: 409 });

  const now = new Date().toISOString();
  const doc = { employeeId: emp.id, empName: emp.name, type: type.id, typeLabel: type.label, paid: type.paid, from, to, half, days, reason, status: "pending", byAdmin: false, decidedBy: "", decidedAt: "", decisionNote: "", createdAt: now, updatedAt: now };
  const col = await leavesCol();
  const { insertedId } = await col.insertOne(doc);
  const bal = leaveBalance(s, (await col.find({ employeeId: emp.id }).toArray()).map(toLeave), from.slice(0, 4)).find((x) => x.id === type.id);
  const over = bal && bal.perYear > 0 && bal.used + bal.pending > bal.perYear;
  const when = rangeText(from, to, half);
  const link = `${originOf(req)}/admin#attendance`;
  await notifyAdmin(`Leave request: ${emp.name}, ${when}`, [["Employee", emp.name], ["Leave", `${type.label}${type.paid ? "" : " (unpaid)"}`], ["Dates", when], ["Working days", String(days)], ["Reason", reason], ["Balance", bal ? (bal.perYear ? `${bal.used} used of ${bal.perYear} this year, ${bal.pending} waiting${over ? " (more than allowed)" : ""}` : "No yearly limit") : "-"]], link).catch(() => undefined);
  const content = await getContent().catch(() => null);
  if (content?.leadReplies?.whatsappAlert) await sendWhatsAppAlert(`🗓️ Leave request\n${emp.name}: ${type.label}, ${when} (${days} day${days === 1 ? "" : "s"})\n${reason.slice(0, 200)}${over ? "\n⚠️ More than the yearly limit" : ""}\n${link}`).catch(() => undefined);
  return NextResponse.json({ ok: true, id: String(insertedId) }, { status: 201 });
}
