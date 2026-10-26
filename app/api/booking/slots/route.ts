import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { availableDays, getBookingSettings } from "@/lib/booking-db";

export const dynamic = "force-dynamic";

// Free times for the booking page (India time). ?except=<token> leaves out the caller's own call when moving it.
export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ enabled: false, days: [] });
  const s = await getBookingSettings();
  if (!s.enabled) return NextResponse.json({ enabled: false, days: [] });
  const except = new URL(req.url).searchParams.get("except") ?? "";
  let exceptId = "";
  if (/^[A-Za-z0-9_-]{20,40}$/.test(except)) {
    const { bookingsCol } = await import("@/lib/booking-db");
    exceptId = String((await (await bookingsCol()).findOne({ token: except, status: "confirmed" }, { projection: { _id: 1 } }))?._id ?? "");
  }
  return NextResponse.json({ enabled: true, duration: s.duration, days: await availableDays(s, Date.now(), exceptId) }, { headers: { "cache-control": "no-store" } });
}
