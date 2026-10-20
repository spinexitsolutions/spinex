// Server only. Time-based one-time codes (RFC 6238), the 6-digit codes shown by Google Authenticator,
// Microsoft Authenticator, Authy and similar apps. No extra packages needed.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string) {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

function hotp(secret: string, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const off = h[h.length - 1] & 15;
  const num = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(num % 1_000_000).padStart(6, "0");
}

export const totpNow = (secret: string, at = Date.now()) => hotp(secret, Math.floor(at / 30000));

// Accepts the current code and the one just before/after (phone clocks are often a few seconds off).
export function verifyTotp(secret: string, code: string, at = Date.now()) {
  const c = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(c) || !secret) return false;
  const step = Math.floor(at / 30000);
  return [-1, 0, 1].some((d) => {
    const want = hotp(secret, step + d);
    return timingSafeEqual(Buffer.from(want), Buffer.from(c));
  });
}

export function otpauthUrl(secret: string, account: string, issuer = "Spinex Admin") {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// One-time backup codes for when the phone is lost: shown once, stored only as hashes.
export const hashCode = (code: string) => createHash("sha256").update(`spinex-backup:${code.replace(/[\s-]/g, "").toLowerCase()}`).digest("hex");
export function newBackupCodes(n = 8) {
  return Array.from({ length: n }, () => {
    const raw = randomBytes(5).toString("hex"); // 10 characters
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}
