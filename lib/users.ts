import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "./db";
import { ROLES, type Role } from "./roles";

export type AdminUser = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: string; lastLogin: string };

export const usersCol = async () => (await getDb()).collection("admin_users");

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function checkPassword(pw: string, stored: string) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const validRole = (r: unknown): Role => (ROLES.includes(r as Role) && r !== "owner" ? (r as Role) : "editor");

export function toUser(doc: any): AdminUser {
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    email: doc.email ?? "",
    role: doc.role ?? "editor",
    active: doc.active !== false,
    createdAt: doc.createdAt ?? "",
    lastLogin: doc.lastLogin ?? "",
  };
}
