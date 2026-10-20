import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/admin-guard";
import { listActivity } from "@/lib/activity";
import { allowed } from "@/lib/roles";
import { hasDb } from "@/lib/db";

// Owner and admins see everyone's activity; everyone else sees only their own.
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasDb()) return NextResponse.json([]);
  const p = new URL(req.url).searchParams;
  const all = allowed(s, "activity", "view");
  return NextResponse.json(
    await listActivity({ area: p.get("area") || undefined, uid: all ? p.get("uid") || undefined : s.uid, before: p.get("before") || undefined, limit: 100 }),
  );
}
