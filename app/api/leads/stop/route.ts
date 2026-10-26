import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { stopFollowups } from "@/lib/lead-followups";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Not available." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { token?: unknown };
  const r = await stopFollowups(String(b.token ?? "").slice(0, 60));
  return r ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Link not found." }, { status: 404 });
}
