// Private demo videos: videos the owner uploads in Admin → Demo videos and shares with one client at a time
// through a secret link (/v/<token>). Shared by the admin screen and the server.

export type DemoVideo = {
  id: string;
  title: string;
  status: "processing" | "ready" | "failed";
  error: string;
  duration: number; // seconds
  width: number;
  height: number;
  size: number; // bytes of the watermarked file
  burned: boolean; // the Spinex watermark is printed into the video itself
  createdAt: string;
  by: string;
};

export type DemoLink = {
  id: string;
  videoId: string;
  token: string;
  client: string;
  phone: string;
  expiresAt: string;
  maxViews: number;
  views: number;
  pin: string; // empty = no PIN
  showName: boolean; // client's name and mobile move over the video
  revoked: boolean;
  createdAt: string;
  lastViewedAt: string;
  by: string;
};

export type LinkState = "active" | "expired" | "used" | "revoked";
export function linkState(l: Pick<DemoLink, "revoked" | "expiresAt" | "views" | "maxViews">, now = Date.now()): LinkState {
  if (l.revoked) return "revoked";
  if (l.expiresAt && Date.parse(l.expiresAt) < now) return "expired";
  if (l.maxViews > 0 && l.views >= l.maxViews) return "used";
  return "active";
}
export const linkStateLabel: Record<LinkState, string> = { active: "Active", expired: "Expired", used: "All views used", revoked: "Turned off" };

// "98765 43210" → "98•••••210": enough for the client to see it's them, not the full number.
export function maskPhone(p: string) {
  const d = (p || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (d.length < 6) return d;
  return `${d.slice(0, 2)}${"•".repeat(Math.max(3, d.length - 5))}${d.slice(-3)}`;
}

export const MAX_DEMO_BYTES = 1024 * 1024 * 1024; // 1 GB upload
export const DEMO_DAYS = [1, 3, 7, 15, 30];
export const DEMO_VIEWS = [1, 3, 5, 10, 25, 0]; // 0 = no limit
