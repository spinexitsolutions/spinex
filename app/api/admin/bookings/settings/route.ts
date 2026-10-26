import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanBookingSettings } from "@/lib/booking";
import { saveBookingSettings } from "@/lib/booking-db";

export async function PUT(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const next = cleanBookingSettings(await jsonBody(req));
  await saveBookingSettings(next);
  await logActivity(await getSession(), "Call booking", `${next.enabled ? "Turned on" : "Turned off"} call booking (${next.duration} min calls)`, "", req);
  return NextResponse.json(next);
}
