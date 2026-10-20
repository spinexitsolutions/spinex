import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, verifyToken, type Session } from "./auth";
import { accessOf, can, type Level, type Perm } from "./roles";
import { hasDb } from "./db";

// Team members are re-checked against the database, so removing or changing someone takes effect at once.
export async function getSession(): Promise<Session | null> {
  const s = await verifyToken(cookies().get(COOKIE)?.value);
  if (!s || !hasDb()) return s;
  if (s.uid === "env") {
    // The owner's sessions end when the owner's password changes or two-step login is turned on/off.
    try {
      const { getDb } = await import("./db");
      const doc = await (await getDb()).collection<{ _id: string; tokenVersion?: number }>("settings").findOne({ _id: "owner_account" }, { projection: { tokenVersion: 1 } });
      return (Number(doc?.tokenVersion) || 0) === (s.tv ?? 0) ? s : null;
    } catch (e) {
      console.error("Could not check the owner's session:", e);
      return s; // database trouble must not lock the owner out
    }
  }
  try {
    const { usersCol } = await import("./users");
    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(s.uid)) return null;
    const u = await (await usersCol()).findOne({ _id: new ObjectId(s.uid) }, { projection: { role: 1, active: 1, name: 1, tokenVersion: 1, access: 1 } });
    if (!u || u.active === false) return null;
    // Password changed / account deactivated since this login: the old session is no longer valid.
    if ((Number(u.tokenVersion) || 0) !== (s.tv ?? 0)) return null;
    // Role and access come from the database, so a change by the owner applies on the next click.
    const fresh = { ...s, role: u.role, name: u.name || s.name, access: (u.access as Session["access"]) ?? null };
    return { ...fresh, access: accessOf(fresh) };
  } catch (e) {
    // Can't confirm this team member is still active, so don't let them in (the env owner is unaffected).
    console.error("Could not check the team member's account:", e);
    return null;
  }
}

export async function isAdmin() {
  return !!(await getSession());
}

export const unauthorized = () => NextResponse.json({ error: "Please log in again." }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Your role doesn't have access to this." }, { status: 403 });
export const noDb = () =>
  NextResponse.json({ error: "Database isn't connected. Add MONGODB_URI to .env.local and restart the server." }, { status: 503 });

// Returns an error response when the current user can't do this, or null when it's allowed.
// level "view" for reading, "edit" (default) for changing. perm "users" = owner only.
export async function guard(perm: Perm, level: Level = "edit", needDb = true): Promise<NextResponse | null> {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!can(s, perm, level)) return forbidden();
  if (needDb && !hasDb()) return noDb();
  return null;
}

// The request's JSON body as a plain object. A missing/invalid body, `null`, an array or a primitive gives {}.
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const b: unknown = (await req.json().catch(() => null)) ?? {};
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
}
