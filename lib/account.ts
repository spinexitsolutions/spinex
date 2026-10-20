// Server only. Login details for the owner and team members: password, two-step login (authenticator app),
// backup codes and the "log out everywhere" counter. The owner's password starts in .env.local (ADMIN_PASSWORD);
// once it is changed or reset from the admin panel, the new one (stored as a hash) is used instead.
import { createHash, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { getDb, hasDb } from "./db";
import { checkPassword, hashPassword, usersCol } from "./users";
import { decrypt, encrypt } from "./secrets";
import { hashCode, totpStep } from "./totp";

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
  if (a.uid === "env" && !a.passwordHash) {
    const env = process.env.ADMIN_PASSWORD || "";
    return !!env && !!password && same(password, env);
  }
  return checkPassword(password, a.passwordHash);
}

// A stored password hash to check against when the email is unknown, so the reply takes the same time.
export const DUMMY_HASH = "0000000000000000000000000000000000000000000000000000000000000000:" + "0".repeat(128);

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
  update(a, { totpSecret: a.totpPending, totpPending: "", totpEnabled: true, backupCodes: backupHashes, totpLastStep: 0 }, true);
export const disableTotp = (a: Account) => update(a, { totpSecret: "", totpPending: "", totpEnabled: false, backupCodes: [], totpLastStep: 0 }, true);
export const setBackupCodes = (a: Account, hashes: string[]) => update(a, { backupCodes: hashes });

// The document holding this account, for single atomic updates.
async function accountUpdate(a: Pick<Account, "uid">, filter: Record<string, unknown>, op: Record<string, unknown>) {
  if (a.uid === "env") return (await ownerCol()).updateOne({ _id: OWNER_DOC, ...filter }, op);
  return (await usersCol()).updateOne({ _id: new ObjectId(a.uid), ...filter }, op);
}

// Checks a 6-digit app code (each code works once), or a backup code (used up the moment it works,
// even if two requests send it at the same time).
export async function checkSecondStep(a: Account, code: string): Promise<"app" | "backup" | false> {
  if (!a.totpEnabled) return false;
  const step = totpStep(a.totpSecret, code);
  if (step >= 0) {
    const r = await accountUpdate(a, { $or: [{ totpLastStep: { $exists: false } }, { totpLastStep: { $lt: step } }] }, { $set: { totpLastStep: step } });
    return r.modifiedCount === 1 ? "app" : false;
  }
  const h = hashCode(code);
  if (code.replace(/[\s-]/g, "").length === 10 && a.backupCodes.includes(h)) {
    const r = await accountUpdate(a, { backupCodes: h }, { $pull: { backupCodes: h } });
    return r.modifiedCount === 1 ? "backup" : false;
  }
  return false;
}

// Emergency switch for the owner who lost both phone and backup codes: set ADMIN_RESET_2FA=yes in .env and restart.
export const ownerTwoStepBypassed = () => (process.env.ADMIN_RESET_2FA || "").trim().toLowerCase() === "yes";
