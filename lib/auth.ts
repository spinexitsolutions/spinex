import { SignJWT, jwtVerify } from "jose";
import type { Access, Role } from "./roles";

// Edge-safe helpers (used by middleware and API routes).
export const COOKIE = "spinex_admin";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");

// tv = the team member's tokenVersion at login; bumping it in the database logs out older sessions.
// access is read fresh from the database on every request (never stored in the login cookie).
export type Session = { email: string; name: string; role: Role; uid: string; tv?: number; access?: Partial<Access> | null };

export async function createToken(s: Session) {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

// Short-lived pass between "password correct" and "code correct" for two-step login. Never a login by itself.
export async function createTicket(s: Session) {
  return new SignJWT({ ...s, purpose: "2fa" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(secret());
}
export async function verifyTicket(ticket?: string): Promise<Session | null> {
  if (!ticket || (process.env.AUTH_SECRET || "").length < 32) return null;
  try {
    const { payload } = await jwtVerify(ticket, secret());
    if (payload.purpose !== "2fa") return null;
    return { email: String(payload.email), name: String(payload.name ?? payload.email), role: (payload.role as Role) || "editor", uid: String(payload.uid ?? ""), tv: typeof payload.tv === "number" ? payload.tv : 0 };
  } catch {
    return null;
  }
}

export async function verifyToken(token?: string): Promise<Session | null> {
  if (!token || (process.env.AUTH_SECRET || "").length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose) return null; // a two-step ticket is not a login
    return {
      email: String(payload.email),
      name: String(payload.name ?? payload.email),
      role: (payload.role as Role) || "owner",
      uid: String(payload.uid ?? "env"),
      tv: typeof payload.tv === "number" ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}
