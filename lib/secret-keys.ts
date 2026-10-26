// The API keys and settings that can be managed in Admin → API keys.
// Shared by the server and the admin screen; holds names only, never values.

export type KeyDef = { name: string; label: string; hint?: string; secret?: boolean; placeholder?: string };
export type KeyGroup = { id: string; title: string; note: string; keys: KeyDef[]; test?: "email" | "chat" | "webhook" | "whatsapp" };

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
    id: "whatsapp",
    title: "WhatsApp alerts",
    note: "Get a WhatsApp message for every new enquiry. Fill ONE of the three options: (1) your own WhatsApp API panel link, (2) Meta WhatsApp Cloud API, or (3) CallMeBot, free for your own number: follow the 3 steps on callmebot.com (save their number, send them the activation message on WhatsApp) and paste the API key they reply with. Turn alerts on or off in Admin → Auto-reply and alerts.",
    test: "whatsapp",
    keys: [
      { name: "WA_ALERT_TO", label: "Send alerts to (your WhatsApp number)", placeholder: "91 98765 43210", hint: "with country code" },
      { name: "WA_API_URL", label: "Option 1 · Your WhatsApp panel's send link", secret: true, placeholder: "https://yourpanel.com/api/send?to={to}&message={text}&token=…", hint: "put {to} and {text} where the number and message go" },
      { name: "WA_CLOUD_TOKEN", label: "Option 2 · Cloud API access token", secret: true, hint: "Meta → WhatsApp → API setup (use a permanent system user token)" },
      { name: "WA_CLOUD_PHONE_ID", label: "Option 2 · Phone number ID", hint: "the sending number's ID, not the number itself" },
      { name: "WA_CLOUD_TEMPLATE", label: "Option 2 · Template name", placeholder: "new_lead_alert", hint: "an approved Utility template with one {{1}} in the body" },
      { name: "WA_CLOUD_LANG", label: "Option 2 · Template language", placeholder: "en", hint: "e.g. en, en_US, hi" },
      { name: "CALLMEBOT_APIKEY", label: "Option 3 · CallMeBot API key", secret: true },
    ],
  },
  {
    id: "razorpay",
    title: "Online payments (Razorpay)",
    note: "Adds a “Pay now” button (UPI, cards, netbanking, wallets) on invoice links. Paid invoices are marked paid on their own. In Razorpay → Account & Settings → API keys, generate keys (test keys start with rzp_test_). Then in Webhooks add the URL https://YOUR-DOMAIN/api/razorpay/webhook with the event payment.captured, choose a webhook secret and paste it here too.",
    keys: [
      { name: "RAZORPAY_KEY_ID", label: "Key ID", placeholder: "rzp_live_… or rzp_test_…" },
      { name: "RAZORPAY_KEY_SECRET", label: "Key secret", secret: true },
      { name: "RAZORPAY_WEBHOOK_SECRET", label: "Webhook secret", secret: true, hint: "the secret you typed when adding the webhook" },
    ],
  },
  {
    id: "adleads",
    title: "Leads from ads (Meta and Google)",
    note: "Leads from Facebook / Instagram instant forms and Google Ads lead forms go straight into Admin → Leads. The step-by-step setup and the webhook links are in Admin → Leads → Get leads from ads.",
    keys: [
      { name: "META_APP_SECRET", label: "Meta · App secret", secret: true, hint: "developers.facebook.com → your app → App settings → Basic" },
      { name: "META_VERIFY_TOKEN", label: "Meta · Verify token", secret: true, hint: "any long text; type the same in the Meta webhook setup" },
      { name: "META_PAGE_TOKEN", label: "Meta · Page access token", secret: true, hint: "a long-lived Page token with leads_retrieval permission" },
      { name: "META_GRAPH_VERSION", label: "Meta · Graph API version", placeholder: "v23.0", hint: "leave empty for the default" },
      { name: "GOOGLE_LEADS_KEY", label: "Google Ads · Webhook key", secret: true, hint: "any long text; type the same in the lead form's webhook settings" },
    ],
  },
  {
    id: "googlecal",
    title: "Google Calendar (call booking)",
    note: "Gives every booked call its own Google Meet link, puts it in your calendar and keeps busy times off the booking page. Steps are in Admin → Call bookings → Settings. The refresh token is filled in when you press Connect Google Calendar.",
    keys: [
      { name: "GOOGLE_OAUTH_CLIENT_ID", label: "OAuth client ID", placeholder: "…apps.googleusercontent.com" },
      { name: "GOOGLE_OAUTH_CLIENT_SECRET", label: "OAuth client secret", secret: true },
      { name: "GOOGLE_CAL_REFRESH_TOKEN", label: "Refresh token (filled in by Connect)", secret: true },
      { name: "GOOGLE_CAL_ID", label: "Calendar", placeholder: "primary", hint: "leave empty for your main calendar" },
    ],
  },
  {
    id: "googlereviews",
    title: "Google reviews on the website",
    note: "Shows your live Google rating and reviews on the home page. In console.cloud.google.com turn on “Places API (New)”, create an API key (restrict it to Places API) and paste it here. Add your Place ID in Admin → Google reviews.",
    keys: [{ name: "GOOGLE_PLACES_API_KEY", label: "Places API key", secret: true }],
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
