import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { cronKey, getAutomation, saveAutomation } from "@/lib/automation";
import { readState } from "@/lib/settings-db";
import { SITE_URL } from "@/lib/site";

// Owner only: reminder and backup settings, when the jobs last ran, and the scheduler link.
export async function GET(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const [settings, state, key] = await Promise.all([getAutomation(), readState("automation"), cronKey()]);
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const { cronKey: _k, ...publicState } = state;
  return NextResponse.json({
    settings,
    state: publicState,
    cronUrl: `${origin}/api/cron?key=${key}`,
    healthUrl: `${origin}/api/health`,
    vercelCron: !!process.env.VERCEL && !!process.env.CRON_SECRET,
  });
}

export async function PUT(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  return NextResponse.json(await saveAutomation(await jsonBody(req)));
}
