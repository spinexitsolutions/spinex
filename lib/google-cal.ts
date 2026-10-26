// Server only. Google Calendar for call booking: busy times, and events with a Google Meet link.
// Connected once by the owner (Admin → Call bookings → Connect Google Calendar), which saves a refresh token.
import { getSecret } from "./secrets";

const OAUTH = () => (process.env.GOOGLE_OAUTH_URL || "https://oauth2.googleapis.com").replace(/\/+$/, "");
const API = () => (process.env.GOOGLE_API_URL || "https://www.googleapis.com").replace(/\/+$/, "");
export const AUTH_URL = () => (process.env.GOOGLE_AUTH_URL || "https://accounts.google.com").replace(/\/+$/, "");
export const CAL_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy";

export async function googleKeys() {
  const [clientId, clientSecret, refresh, cal] = await Promise.all([getSecret("GOOGLE_OAUTH_CLIENT_ID"), getSecret("GOOGLE_OAUTH_CLIENT_SECRET"), getSecret("GOOGLE_CAL_REFRESH_TOKEN"), getSecret("GOOGLE_CAL_ID")]);
  return { clientId, clientSecret, refresh, calendarId: cal || "primary", ready: !!clientId && !!clientSecret, connected: !!clientId && !!clientSecret && !!refresh };
}

// Code from Google's consent screen → refresh token (step 2 of connecting).
export async function exchangeCode(code: string, redirectUri: string) {
  const k = await googleKeys();
  const res = await fetch(`${OAUTH()}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: k.clientId, client_secret: k.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(12000),
  });
  const d = (await res.json().catch(() => ({}))) as { refresh_token?: string; access_token?: string; error_description?: string; error?: string };
  if (!res.ok || !d.refresh_token) throw new Error(d.error_description || d.error || "Google didn't give a refresh token. Remove the app's access in your Google account and connect again.");
  return d;
}

let cached: { token: string; until: number; key: string } | null = null;
async function accessToken() {
  const k = await googleKeys();
  if (!k.connected) throw new Error("Google Calendar isn't connected.");
  if (cached && cached.key === k.refresh && cached.until > Date.now() + 60e3) return cached.token;
  const res = await fetch(`${OAUTH()}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: k.clientId, client_secret: k.clientSecret, refresh_token: k.refresh, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(12000),
  });
  const d = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !d.access_token) throw new Error(d.error === "invalid_grant" ? "Google Calendar access was removed or expired. Connect it again." : d.error_description || "Couldn't reach Google Calendar.");
  cached = { token: d.access_token, until: Date.now() + (d.expires_in ?? 3000) * 1000, key: k.refresh };
  return d.access_token;
}

async function gcal<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API()}/calendar/v3${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 204) return {} as T;
  const d = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(d.error?.message || `Google Calendar replied ${res.status}`);
  return d;
}

// Busy times in the connected calendar (cached for a minute so the booking page stays fast).
let busyCache: { key: string; at: number; busy: { start: number; end: number }[] } | null = null;
export async function busyTimes(fromIso: string, toIso: string) {
  const k = await googleKeys();
  if (!k.connected) return [];
  const key = `${k.calendarId}|${fromIso}|${toIso}`;
  if (busyCache && busyCache.key === key && Date.now() - busyCache.at < 60e3) return busyCache.busy;
  const d = await gcal<{ calendars?: Record<string, { busy?: { start: string; end: string }[] }> }>("/freeBusy", { method: "POST", body: JSON.stringify({ timeMin: fromIso, timeMax: toIso, timeZone: "Asia/Kolkata", items: [{ id: k.calendarId }] }) });
  const busy = Object.values(d.calendars ?? {}).flatMap((c) => c.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  busyCache = { key, at: Date.now(), busy };
  return busy;
}
export const forgetBusy = () => { busyCache = null; };

type GEvent = { id?: string; hangoutLink?: string; htmlLink?: string; conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] } };
const meetOf = (e: GEvent) => e.hangoutLink || e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri || "";

// Makes the calendar event with a new Google Meet link and invites the client.
export async function createCallEvent(p: { requestId: string; title: string; description: string; start: string; end: string; email: string; name: string }) {
  const k = await googleKeys();
  const e = await gcal<GEvent>(`/calendars/${encodeURIComponent(k.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    body: JSON.stringify({
      summary: p.title,
      description: p.description,
      start: { dateTime: p.start, timeZone: "Asia/Kolkata" },
      end: { dateTime: p.end, timeZone: "Asia/Kolkata" },
      attendees: p.email ? [{ email: p.email, displayName: p.name }] : [],
      conferenceData: { createRequest: { requestId: p.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 }, { method: "email", minutes: 60 }] },
    }),
  });
  forgetBusy();
  return { id: e.id ?? "", meetLink: meetOf(e) };
}

export async function moveCallEvent(id: string, start: string, end: string) {
  const k = await googleKeys();
  await gcal(`/calendars/${encodeURIComponent(k.calendarId)}/events/${encodeURIComponent(id)}?sendUpdates=all`, { method: "PATCH", body: JSON.stringify({ start: { dateTime: start, timeZone: "Asia/Kolkata" }, end: { dateTime: end, timeZone: "Asia/Kolkata" } }) });
  forgetBusy();
}

export async function cancelCallEvent(id: string) {
  const k = await googleKeys();
  await gcal(`/calendars/${encodeURIComponent(k.calendarId)}/events/${encodeURIComponent(id)}?sendUpdates=all`, { method: "DELETE" });
  forgetBusy();
}

export async function calendarEmail() {
  const k = await googleKeys();
  const d = await gcal<{ id?: string; summary?: string }>(`/calendars/${encodeURIComponent(k.calendarId)}`);
  return d.id || d.summary || "";
}
