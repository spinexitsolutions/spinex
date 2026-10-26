import { NextResponse } from "next/server";
import { getSession, guard } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { saveSecrets } from "@/lib/secrets";
import { writeState } from "@/lib/settings-db";

export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  await saveSecrets({ GOOGLE_CAL_REFRESH_TOKEN: null }, {});
  await writeState("google_cal", { email: "", error: "" });
  await logActivity(await getSession(), "Call booking", "Disconnected Google Calendar", "", req);
  return NextResponse.json({ ok: true });
}
