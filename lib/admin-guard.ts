import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, verifyToken, type Session } from "./auth";
import { can, type Perm } from "./roles";
import { hasDb } from "./db";

// Team members are re-checked against the database, so removing or changing someone takes effect at once.
export async function getSession(): Promise<Session | null> {
  const s = await verifyToken(cookies().get(COOKIE)?.value);
  if (!s || s.uid === "env" || !hasDb()) return s;
  try {
    const { usersCol } = await import("./users");
    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(s.uid)) return null;
    const u = await (await usersCol()).findOne({ _id: new ObjectId(s.uid) }, { projection: { role: 1, active: 1, name: 1, tokenVersion: 1 } });
    if (!u || u.active === false) return null;
    // Password changed / account deactivated since this login: the old session is no longer valid.
    if ((Number(u.tokenVersion) || 0) !== (s.tv ?? 0)) return null;
    return { ...s, role: u.role, name: u.name || s.name };
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
export async function guard(perm: Perm, needDb = true): Promise<NextResponse | null> {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!can(s.role, perm)) return forbidden();
  if (needDb && !hasDb()) return noDb();
  return null;
}

// The request's JSON body as a plain object. A missing/invalid body, `null`, an array or a primitive gives {}.
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const b: unknown = (await req.json().catch(() => null)) ?? {};
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
}
