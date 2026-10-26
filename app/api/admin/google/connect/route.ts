import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { guard } from "@/lib/admin-guard";
import { AUTH_URL, CAL_SCOPES, googleKeys } from "@/lib/google-cal";
import { SITE_URL } from "@/lib/site";

// Owner only: opens Google's consent screen to connect the calendar for call booking.
export async function GET(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const k = await googleKeys();
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  if (!k.ready) return NextResponse.redirect(`${origin}/admin#bookings`);
  const state = randomBytes(18).toString("base64url");
  const q = new URLSearchParams({ client_id: k.clientId, redirect_uri: `${origin}/api/admin/google/callback`, response_type: "code", scope: CAL_SCOPES, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
  const res = NextResponse.redirect(`${AUTH_URL()}/o/oauth2/v2/auth?${q}`);
  res.cookies.set({ name: "g_oauth_state", value: state, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/google", maxAge: 600 });
  return res;
}
