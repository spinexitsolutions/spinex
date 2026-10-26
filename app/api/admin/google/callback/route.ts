import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, guard } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { calendarEmail, exchangeCode } from "@/lib/google-cal";
import { saveSecrets } from "@/lib/secrets";
import { writeState } from "@/lib/settings-db";
import { SITE_URL } from "@/lib/site";
import { safeEqual } from "@/lib/ad-leads";

// Google sends the owner back here after they allow access. The refresh token is saved (encrypted) with the API keys.
export async function GET(req: Request) {
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const back = (q: string) => NextResponse.redirect(`${origin}/admin?google=${q}#bookings`);
  const deny = await guard("users");
  if (deny) return deny;
  const u = new URL(req.url).searchParams;
  const state = cookies().get("g_oauth_state")?.value ?? "";
  if (!state || !safeEqual(state, String(u.get("state") ?? ""))) return back("state");
  if (u.get("error") || !u.get("code")) {
    await writeState("google_cal", { error: `Google said: ${u.get("error") || "no code"}` });
    return back("denied");
  }
  try {
    const t = await exchangeCode(String(u.get("code")), `${origin}/api/admin/google/callback`);
    await saveSecrets({ GOOGLE_CAL_REFRESH_TOKEN: t.refresh_token! }, {});
    const email = await calendarEmail().catch(() => "");
    await writeState("google_cal", { email, error: "", connectedAt: new Date().toISOString() });
    await logActivity(await getSession(), "Call booking", `Connected Google Calendar${email ? ` (${email})` : ""}`, "", req);
    const res = back("ok");
    res.cookies.set({ name: "g_oauth_state", value: "", path: "/api/admin/google", maxAge: 0 });
    return res;
  } catch (e) {
    await writeState("google_cal", { error: e instanceof Error ? e.message : "Couldn't connect." });
    return back("error");
  }
}
