import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { runBackup, runReminders } from "@/lib/automation";

export const maxDuration = 60;

// "Run now" buttons in Admin → Automation and backups.
export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const { job } = await jsonBody(req);
  const origin = new URL(req.url).origin;
  if (job === "reminders") {
    const r = await runReminders(origin);
    return NextResponse.json({ ok: true, message: r.due ? `${r.due} follow-up${r.due > 1 ? "s" : ""} due, ${r.sent} reminder email${r.sent === 1 ? "" : "s"} sent.` : "No follow-ups are due today, so nothing was sent." });
  }
  if (job === "backup") {
    const r = await runBackup();
    return NextResponse.json({ ok: r.ok, message: r.result });
  }
  return NextResponse.json({ ok: false, message: "Unknown job." }, { status: 400 });
}
