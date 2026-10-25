import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { clientIp } from "@/lib/antispam";
import { getStaffSession } from "@/lib/staff-auth";
import { isJsonRequest } from "@/lib/portal-db";
import { todayIST } from "@/lib/leave";
import { attendanceCol } from "@/lib/leave-db";

// { action: "in" | "out" } for today (India date). Check-in time is kept from the first press.
export async function POST(req: Request) {
  const emp = await getStaffSession();
  if (!emp) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { action } = await jsonBody(req);
  const date = todayIST();
  const _id = `${emp.id}:${date}`;
  const col = await attendanceCol();
  const now = new Date().toISOString();
  if (action === "in") {
    await col.updateOne({ _id }, { $setOnInsert: { employeeId: emp.id, date }, $min: { checkIn: now } as never, $set: { ip: clientIp(req), updatedAt: now } }, { upsert: true });
  } else if (action === "out") {
    const day = await col.findOne({ _id });
    if (!day?.checkIn) return NextResponse.json({ error: "Check in first." }, { status: 400 });
    await col.updateOne({ _id }, { $set: { checkOut: now, updatedAt: now } });
  } else return NextResponse.json({ error: "Bad request." }, { status: 400 });
  return NextResponse.json({ ok: true, day: await col.findOne({ _id }, { projection: { _id: 0, checkIn: 1, checkOut: 1 } }) });
}
