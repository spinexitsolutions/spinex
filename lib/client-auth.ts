// Server only. Client portal logins: a signed cookie, separate from the team's admin login.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { hasDb } from "./db";
import { clientsCol, pOid, toClient } from "./portal-db";
import type { PortalClient } from "./portal";

export const CLIENT_COOKIE = "spinex_client";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");
const DAYS = 30;

// purpose "client" keeps this token from ever working as a team login (and the other way round).
export async function createClientToken(cid: string, tv: number) {
  return new SignJWT({ cid, tv, purpose: "client" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${DAYS}d`).sign(secret());
}

export const clientCookie = (token: string) => ({
  name: CLIENT_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * DAYS,
});

// The logged-in client, re-checked against the database: switching the client off or "log out everywhere"
// (tokenVersion bump) ends their sessions at once.
export async function getClientSession(): Promise<PortalClient | null> {
  const token = cookies().get(CLIENT_COOKIE)?.value;
  if (!token || !hasDb() || (process.env.AUTH_SECRET || "").length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "client" || typeof payload.cid !== "string") return null;
    const _id = pOid(payload.cid);
    const doc = _id && (await (await clientsCol()).findOne({ _id }));
    if (!doc || doc.active === false) return null;
    if ((Number(doc.tokenVersion) || 0) !== (Number(payload.tv) || 0)) return null;
    return toClient(doc);
  } catch {
    return null;
  }
}
