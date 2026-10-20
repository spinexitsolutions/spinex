import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./roles";

// Edge-safe helpers (used by middleware and API routes).
export const COOKIE = "spinex_admin";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");

export type Session = { email: string; name: string; role: Role; uid: string };

export async function createToken(s: Session) {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function verifyToken(token?: string): Promise<Session | null> {
  if (!token || (process.env.AUTH_SECRET || "").length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      email: String(payload.email),
      name: String(payload.name ?? payload.email),
      role: (payload.role as Role) || "owner",
      uid: String(payload.uid ?? "env"),
    };
  } catch {
    return null;
  }
}
