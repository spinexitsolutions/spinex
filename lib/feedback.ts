// Client feedback after a project: a short form (rating + comments), and good ones go to Testimonials after approval.

export type FeedbackSettings = {
  autoOnProjectDone: boolean; // client portal project marked Completed
  autoOnLeadWon: boolean;
  delayDays: number;
  reminderDays: number; // 0 = no reminder
  subject: string;
  message: string; // {name} {project} {brand}
  showGoogleAfter: boolean; // thank-you page offers the Google review link
};
export const defaultFeedbackSettings: FeedbackSettings = {
  autoOnProjectDone: true,
  autoOnLeadWon: false,
  delayDays: 1,
  reminderDays: 5,
  subject: "How did we do on {project}?",
  message: "Thank you for working with us on {project}. We'd love to hear how it went. It takes less than a minute, and it helps us get better.",
  showGoogleAfter: true,
};

export type FeedbackStatus = "scheduled" | "sent" | "answered" | "cancelled" | "failed";
export const feedbackStatusLabel: Record<FeedbackStatus, string> = { scheduled: "Will be sent", sent: "Waiting for reply", answered: "Answered", cancelled: "Cancelled", failed: "Email failed" };
export type FeedbackApproval = "pending" | "approved" | "hidden";

export type FeedbackResponse = {
  rating: number; // 1–5
  liked: string; // shown on the website if approved
  better: string; // private
  publish: boolean; // client agreed it can be shown on the website
  displayName: string;
  role: string; // e.g. Founder
  company: string;
  at: string;
};

export type Feedback = {
  id: string; name: string; email: string; phone: string; project: string; clientId: string;
  source: "project" | "lead" | "manual"; token: string; status: FeedbackStatus;
  sendAt: string; sentAt: string; reminded: boolean; error: string; by: string; createdAt: string;
  response: FeedbackResponse | null;
  approval: FeedbackApproval;
  testimonialId: string; // set once it is on the website
  quote: string; // the text used on the website (can be tidied by the team)
};

export function cleanFeedbackSettings(b: Record<string, unknown>): FeedbackSettings {
  const d = defaultFeedbackSettings;
  const n = (v: unknown, max: number, def: number) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(0, Math.round(Number(v)))) : def);
  return {
    autoOnProjectDone: b.autoOnProjectDone !== false,
    autoOnLeadWon: !!b.autoOnLeadWon,
    delayDays: n(b.delayDays, 30, d.delayDays),
    reminderDays: n(b.reminderDays, 30, d.reminderDays),
    subject: String(b.subject ?? "").trim().slice(0, 150) || d.subject,
    message: String(b.message ?? "").trim().slice(0, 1500) || d.message,
    showGoogleAfter: b.showGoogleAfter !== false,
  };
}
