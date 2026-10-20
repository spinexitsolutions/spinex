// The API keys and settings that can be managed in Admin → API keys.
// Shared by the server and the admin screen; holds names only, never values.

export type KeyDef = { name: string; label: string; hint?: string; secret?: boolean; placeholder?: string };
export type KeyGroup = { id: string; title: string; note: string; keys: KeyDef[]; test?: "email" | "chat" | "webhook" };

export const KEY_GROUPS: KeyGroup[] = [
  {
    id: "email",
    title: "Email alerts (SMTP)",
    note: "Sends you an email for every new enquiry and job application, and emails to interns. For Gmail use smtp.gmail.com, port 465 and a 16-letter App Password.",
    test: "email",
    keys: [
      { name: "SMTP_HOST", label: "SMTP server", placeholder: "smtp.gmail.com" },
      { name: "SMTP_PORT", label: "Port", placeholder: "465" },
      { name: "SMTP_USER", label: "Email login", placeholder: "you@gmail.com" },
      { name: "SMTP_PASS", label: "Password / App password", secret: true },
      { name: "NOTIFY_EMAIL", label: "Send alerts to", placeholder: "spinexitsolutions@gmail.com" },
    ],
  },
  {
    id: "chat",
    title: "AI chatbot (Claude)",
    note: "With a key the chatbot writes its own answers from your site content. Without it, it answers from the FAQ list in Admin → Chatbot.",
    test: "chat",
    keys: [
      { name: "ANTHROPIC_API_KEY", label: "Anthropic API key", secret: true, hint: "from console.anthropic.com" },
      { name: "CHAT_MODEL", label: "Model", placeholder: "claude-haiku-4-5-20251001", hint: "leave empty for the default" },
    ],
  },
  {
    id: "spam",
    title: "Spam protection (Cloudflare Turnstile)",
    note: "An invisible check on all forms that stops bots. Create a free widget at dash.cloudflare.com → Turnstile and paste both keys.",
    keys: [
      { name: "TURNSTILE_SITE_KEY", label: "Site key", hint: "public, starts with 0x" },
      { name: "TURNSTILE_SECRET_KEY", label: "Secret key", secret: true },
    ],
  },
  {
    id: "webhook",
    title: "Send leads to another app (webhook)",
    note: "Every new enquiry is also sent to this URL as JSON: Google Sheets (Apps Script), Zapier, Make, Pabbly or your CRM.",
    test: "webhook",
    keys: [
      { name: "LEAD_WEBHOOK_URL", label: "Webhook URL", placeholder: "https://hooks.zapier.com/…", secret: true },
      { name: "LEAD_WEBHOOK_SECRET", label: "Secret header (optional)", secret: true, hint: "sent as X-Webhook-Secret" },
    ],
  },
];

export const KNOWN_KEYS = KEY_GROUPS.flatMap((g) => g.keys);
export const isKnownKey = (n: string) => KNOWN_KEYS.some((k) => k.name === n);

// Custom keys: any name in CAPITALS, numbers and _ (e.g. RAZORPAY_KEY_ID), for future features.
export const CUSTOM_PREFIX = "CUSTOM_";
export const validCustomName = (n: string) => /^[A-Z][A-Z0-9_]{1,48}$/.test(n) && !isKnownKey(n) && n !== "HEAD_CODE";

// Extra code placed before </body> on every public page (chat widgets, pixels, tag managers).
export const HEAD_CODE = "HEAD_CODE";

export type KeyStatus = { name: string; set: boolean; source: "admin" | "env" | ""; preview: string };
export type SecretsView = { keys: KeyStatus[]; custom: KeyStatus[]; headCode: string; canEncrypt: boolean };
