import { NextResponse } from "next/server";
import { getDb, hasDb } from "@/lib/db";

// For uptime monitors (UptimeRobot, Better Stack…): 200 when the site and its database work, 503 when not.
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let db = "not set up";
  let ok = true;
  if (hasDb()) {
    try {
      await Promise.race([
        (await getDb()).command({ ping: 1 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      db = "ok";
    } catch {
      db = "down";
      ok = false;
    }
  }
  return NextResponse.json(
    { ok, status: ok ? "up" : "database down", db, ms: Date.now() - started, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
