// Server only. Login details for the owner and team members: password, two-step login (authenticator app),
// backup codes and the "log out everywhere" counter. The owner's password starts in .env.local (ADMIN_PASSWORD);
// once it is changed or reset from the admin panel, the new one (stored as a hash) is used instead.
import { createHash, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { getDb, hasDb } from "./db";
import { checkPassword, hashPassword, usersCol } from "./users";
import { decrypt, encrypt } from "./secrets";
import { hashCode, verifyTotp } from "./totp";

export type Account = {
  uid: string; // "env" = owner
  email: string;
  name: string;
  role: string;
  active: boolean;
  passwordHash: string; // "" = owner still uses ADMIN_PASSWORD from .env.local
  totpSecret: string; // decrypted; "" = not set
  totpEnabled: boolean;
  totpPending: string; // decrypted secret waiting for the first code
  backupCodes: string[]; // hashes
  tokenVersion: number;
};

const OWNER_DOC = "owner_account";
const ownerCol = async () => (await getDb()).collection<{ _id: string } & Record<string, unknown>>("settings");
const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export const ownerEmail = () => (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

function fromDoc(uid: string, d: Record<string, unknown>, base: Partial<Account>): Account {
  return {
    uid,
    email: String(base.email ?? d.email ?? ""),
    name: String(base.name ?? d.name ?? ""),
    role: String(base.role ?? d.role ?? "editor"),
    active: base.active ?? d.active !== false,
    passwordHash: String(d.passwordHash ?? ""),
    totpSecret: d.totpSecret ? decrypt(String(d.totpSecret)) : "",
    totpEnabled: !!d.totpEnabled && !!d.totpSecret,
    totpPending: d.totpPending ? decrypt(String(d.totpPending)) : "",
    backupCodes: Array.isArray(d.backupCodes) ? d.backupCodes.map(String) : [],
    tokenVersion: Number(d.tokenVersion) || 0,
  };
}

export async function getAccount(uid: string): Promise<Account | null> {
  if (uid === "env") {
    const d = hasDb() ? ((await (await ownerCol()).findOne({ _id: OWNER_DOC })) ?? {}) : {};
    return fromDoc("env", d, { email: ownerEmail(), name: "Owner", role: "owner", active: true });
  }
  if (!hasDb() || !ObjectId.isValid(uid)) return null;
  const d = await (await usersCol()).findOne({ _id: new ObjectId(uid) });
  return d ? fromDoc(uid, d, {}) : null;
}

export async function findAccountByEmail(email: string): Promise<Account | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  if (ownerEmail() && same(e, ownerEmail())) return getAccount("env");
  if (!hasDb()) return null;
  const d = await (await usersCol()).findOne({ email: e });
  return d ? fromDoc(String(d._id), d, {}) : null;
}

export function passwordMatches(a: Account, password: string) {
  if (a.uid === "env" && !a.passwordHash) return same(password, process.env.ADMIN_PASSWORD || "");
  return checkPassword(password, a.passwordHash);
}

// Saves fields on the account. Secrets are encrypted before they are stored.
async function update(a: Pick<Account, "uid">, set: Record<string, unknown>, bumpVersion = false) {
  const $set: Record<string, unknown> = { ...set };
  for (const k of ["totpSecret", "totpPending"]) if (typeof $set[k] === "string" && $set[k]) $set[k] = encrypt(String($set[k]));
  const op: Record<string, unknown> = { $set };
  if (bumpVersion) op.$inc = { tokenVersion: 1 };
  if (a.uid === "env") await (await ownerCol()).updateOne({ _id: OWNER_DOC }, op, { upsert: true });
  else await (await usersCol()).updateOne({ _id: new ObjectId(a.uid) }, op);
  return getAccount(a.uid);
}

// New password: older sessions on other devices are logged out.
export const setPassword = (a: Account, password: string) => update(a, { passwordHash: hashPassword(password) }, true);
export const startTotp = (a: Account, secret: string) => update(a, { totpPending: secret });
export const enableTotp = (a: Account, backupHashes: string[]) =>
  update(a, { totpSecret: a.totpPending, totpPending: "", totpEnabled: true, backupCodes: backupHashes }, true);
export const disableTotp = (a: Account) => update(a, { totpSecret: "", totpPending: "", totpEnabled: false, backupCodes: [] }, true);
export const setBackupCodes = (a: Account, hashes: string[]) => update(a, { backupCodes: hashes });

// Checks a 6-digit app code, or a backup code (which is then used up).
export async function checkSecondStep(a: Account, code: string): Promise<"app" | "backup" | false> {
  if (!a.totpEnabled) return false;
  if (verifyTotp(a.totpSecret, code)) return "app";
  const h = hashCode(code);
  if (code.replace(/[\s-]/g, "").length === 10 && a.backupCodes.includes(h)) {
    await update(a, { backupCodes: a.backupCodes.filter((x) => x !== h) });
    return "backup";
  }
  return false;
}

// Emergency switch for the owner who lost both phone and backup codes: set ADMIN_RESET_2FA=yes in .env and restart.
export const ownerTwoStepBypassed = () => (process.env.ADMIN_RESET_2FA || "").trim().toLowerCase() === "yes";
