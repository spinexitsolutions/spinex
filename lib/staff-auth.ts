// Server only. Staff portal logins (employees apply for leave, check in and see payslips). Separate from team and client logins.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { hasDb } from "./db";
import { employeesCol, payOid, toEmployee } from "./payroll-db";
import type { Employee } from "./payroll";

export const STAFF_COOKIE = "spinex_staff";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");
const DAYS = 30;

export async function createStaffToken(eid: string, tv: number) {
  return new SignJWT({ eid, tv, purpose: "staff" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${DAYS}d`).sign(secret());
}
export const staffCookie = (token: string) => ({ name: STAFF_COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * DAYS });

// The logged-in employee, checked against the database: marking them "left" or changing their email ends the session.
export async function getStaffSession(): Promise<Employee | null> {
  const token = cookies().get(STAFF_COOKIE)?.value;
  if (!token || !hasDb() || (process.env.AUTH_SECRET || "").length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "staff" || typeof payload.eid !== "string") return null;
    const _id = payOid(payload.eid);
    const doc = _id && (await (await employeesCol()).findOne({ _id }));
    if (!doc || doc.active === false || !doc.email) return null;
    if ((Number(doc.tokenVersion) || 0) !== (Number(payload.tv) || 0)) return null;
    return toEmployee(doc);
  } catch {
    return null;
  }
}
