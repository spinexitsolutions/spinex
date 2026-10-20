// Visitor's cookie choice, saved in the browser. Used by the cookie banner and Analytics.
export type Consent = "accepted" | "rejected" | "";
const KEY = "spinex-cookie-consent";
export const CONSENT_EVENT = "spinex:consent";
export const OPEN_EVENT = "spinex:consent-open";

export function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : "";
  } catch {
    return ""; // storage blocked: ask again (nothing is tracked until they accept)
  }
}

export function saveConsent(v: "accepted" | "rejected") {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));
