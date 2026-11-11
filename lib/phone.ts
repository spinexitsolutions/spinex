// Phone numbers typed into the website forms. Indian mobiles can be typed with or without +91 / 0;
// anyone outside India types their full number starting with + and the country code.

export const PHONE_HELP = "Enter a 10-digit mobile number, or your full number with the country code (for example +61 7 3041 1315).";

export type PhoneCheck = { ok: boolean; warn: string; tel: string };

export function checkPhone(raw: string): PhoneCheck {
  const text = (raw ?? "").trim();
  let d = text.replace(/\D/g, "");
  const plus = text.startsWith("+") || d.startsWith("00");
  if (d.startsWith("00")) d = d.slice(2);
  const indian = (n: string) => /^[6-9]\d{9}$/.test(n);
  if (!plus) {
    if (indian(d)) return { ok: true, warn: "", tel: `+91${d}` };
    if (d.length === 12 && d.startsWith("91") && indian(d.slice(2))) return { ok: true, warn: "", tel: `+${d}` };
    if (d.length === 11 && d.startsWith("0")) return { ok: true, warn: "", tel: `+91${d.slice(1)}` }; // 0 + mobile or STD landline
    return { ok: false, warn: "This doesn't look like a 10-digit Indian number.", tel: d ? `+91${d}` : "" };
  }
  if (d.startsWith("91")) {
    const rest = d.slice(2);
    if (indian(rest) || (rest.length === 10 && /^[1-5]/.test(rest))) return { ok: true, warn: "", tel: `+${d}` };
    // "+91" put in front of a number from another country, e.g. +91 61 7 3041 1315 (Australia).
    const guess = rest.length >= 8 ? ` It may be a foreign number: +${rest}.` : "";
    return { ok: false, warn: `+91 is followed by ${rest.length} digits, not 10.${guess}`, tel: `+${d}` };
  }
  if (d.length >= 8 && d.length <= 15) return { ok: true, warn: "", tel: `+${d}` };
  return { ok: false, warn: "This number is too short or too long.", tel: `+${d}` };
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v ?? "").trim());
