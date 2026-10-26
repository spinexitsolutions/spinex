import { NextResponse } from "next/server";
import { guard, getSession } from "@/lib/admin-guard";
import { bookingsCol, getBookingSettings, toBooking } from "@/lib/booking-db";
import { googleKeys } from "@/lib/google-cal";
import { readState } from "@/lib/settings-db";
import { can } from "@/lib/roles";
import { SITE_URL, requestOrigin } from "@/lib/site";

// ?when=upcoming (default) or past. Also the settings and whether Google Calendar is connected.
export async function GET(req: Request) {
  const deny = await guard("bookings", "view");
  if (deny) return deny;
  const when = new URL(req.url).searchParams.get("when") === "past" ? "past" : "upcoming";
  const now = new Date().toISOString();
  const col = await bookingsCol();
  const q = when === "upcoming" ? { end: { $gte: now }, status: "confirmed" } : { $or: [{ end: { $lt: now } }, { status: { $ne: "confirmed" } }] };
  const [docs, settings, g, state, upcoming] = await Promise.all([
    col.find(q).sort({ start: when === "upcoming" ? 1 : -1 }).limit(300).toArray(),
    getBookingSettings(),
    googleKeys(),
    readState("google_cal"),
    col.countDocuments({ end: { $gte: now }, status: "confirmed" }),
  ]);
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  return NextResponse.json({
    bookings: docs.map(toBooking),
    upcoming,
    settings,
    google: { ready: g.ready, connected: g.connected, email: String(state.email ?? ""), redirectUri: `${requestOrigin(req)}/api/admin/google/callback`, error: String(state.error ?? "") },
    bookUrl: `${origin}/book`,
    canEdit: can(await getSession(), "leads", "edit"),
    isOwner: can(await getSession(), "users"),
  });
}
