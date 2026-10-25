// Server only. Everything that happens after a new lead is saved: thank-you email, WhatsApp alert, webhook and alert email.
// Shared by the website forms and the ad lead forms (Meta, Google).
import { LEAD_SOURCES, type LeadSource } from "./leads";
import { notifyAdmin } from "./notify";
import { sendLeadWebhook } from "./webhook";
import { getContent } from "./content-server";
import { sendAutoReply } from "./auto-reply";
import { leadAlertText, sendWhatsAppAlert } from "./whatsapp-alert";
import type { LeadTrack } from "./attribution";

type Data = Record<string, string> & { name: string; phone: string };

export async function announceLead(p: { data: Data; plan?: string; source: LeadSource; track: LeadTrack; stamp: string; adminUrl: string; autoReply: boolean; extraRows?: [string, string][] }) {
  const { data, source, track, stamp, adminUrl } = p;
  const plan = p.plan ?? "";
  const content = await getContent().catch(() => null);
  // Each gives up quickly and never throws.
  await Promise.allSettled([
    content && p.autoReply ? sendAutoReply(content, data) : Promise.resolve(false),
    content?.leadReplies?.whatsappAlert
      ? sendWhatsAppAlert(leadAlertText({ ...data, cameVia: [track.channel, track.utmCampaign].filter(Boolean).join(" · ") }, LEAD_SOURCES[source], adminUrl)).then((r) => {
          if (!r.ok && r.via) console.error("WhatsApp alert failed:", r.error);
          return r;
        })
      : Promise.resolve(null),
    sendLeadWebhook({ ...data, plan, source, sourceLabel: LEAD_SOURCES[source], track, createdAt: stamp }),
    notifyAdmin(
      `New enquiry from ${data.name}`,
      [
        ["Name", data.name],
        ["Phone", data.phone],
        ["Email", data.email ?? ""],
        ["Needs", data.services ?? ""],
        ["Budget", data.budget ?? ""],
        ["Message", data.message ?? ""],
        ["Plan", plan],
        ["From", LEAD_SOURCES[source]],
        ["Came via", track.channel],
        ["Campaign", track.utmCampaign],
        ["Keyword", track.utmTerm],
        ["Landing page", track.landingPage],
        ...(p.extraRows ?? []),
      ],
      adminUrl,
    ),
  ]);
}
