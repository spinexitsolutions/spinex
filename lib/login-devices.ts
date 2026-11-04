// Server only. "New device" login alerts: each browser that logs in to the admin gets a long-lived random id
// (cookie). When an account logs in from a browser it hasn't used before, an email goes to that account's
// email (or the recovery email), so a stranger who learnt the password can't log in unnoticed.
import { randomBytes } from "crypto";
import type { NextResponse } from "next/server";
import { getDb, hasDb } from "./db";
import { emailPerson } from "./notify";
import { resetEmailFor, type Account } from "./account";
import { clientIp } from "./antispam";
import { SITE_URL } from "./site";

const COOKIE = "spx_dev";
const devicesCol = async () => (await getDb()).collection<{ _id: string; uid: string; firstAt: string; lastAt: string; ua: string; ip: string }>("login_devices");

const readCookie = (req: Request) => {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)spx_dev=([A-Za-z0-9_-]{16,64})/);
  return m ? m[1] : "";
};

// "Chrome on Windows" from the browser's user-agent text.
export function deviceName(ua: string) {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android phone" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "an unknown device";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "a browser";
  return `${br} on ${os}`;
}

// Call after a successful login, with the response that sets the session cookie.
export async function noteLoginDevice(req: Request, res: NextResponse, account: Account) {
  if (!hasDb()) return;
  try {
    let dev = readCookie(req);
    if (!dev) dev = randomBytes(18).toString("base64url");
    res.cookies.set({ name: COOKIE, value: dev, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 400 * 24 * 3600 });
    const col = await devicesCol();
    const now = new Date().toISOString();
    const ua = (req.headers.get("user-agent") || "").slice(0, 300);
    const ip = clientIp(req);
    const _id = `${account.uid}:${dev}`;
    const known = await col.findOne({ _id });
    if (known) {
      await col.updateOne({ _id }, { $set: { lastAt: now, ua, ip } });
      return;
    }
    // The very first device of an account (e.g. right after this feature went live) is just remembered.
    const firstEver = !(await col.findOne({ uid: account.uid }, { projection: { _id: 1 } }));
    await col.insertOne({ _id, uid: account.uid, firstAt: now, lastAt: now, ua, ip });
    if (firstEver) return;
    const to = resetEmailFor(account);
    if (!to) return;
    const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    void emailPerson(to, "New login to the Spinex admin", "New login from a new device", [
      `Hi ${account.name || "there"}, your Spinex admin account was just logged in to from a device it hasn't used before.`,
      `Device: ${deviceName(ua)}\nIP address: ${ip || "unknown"}\nTime: ${when} (India time)`,
      "If this was you, you don't need to do anything.",
      "If it wasn't you, open the admin, go to My account and change your password right away: that also logs out every other device. Turning on two-step login stops this from happening again.",
    ], { label: "Open My account", url: `${SITE_URL}/admin#account` }).catch(() => undefined);
  } catch (e) {
    console.error(`Login device check failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
