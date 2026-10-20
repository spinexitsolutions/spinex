import { NextResponse } from "next/server";
import { getSession, guard } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { billOid, billingCol, getProfile, toBill } from "@/lib/billing-db";
import { computeTotals, docTitle, inr } from "@/lib/billing";
import { emailPerson } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";

type Ctx = { params: { id: string } };

// Emails the client a link to view and download the quotation / invoice.
export async function POST(req: Request, { params }: Ctx) {
  const deny = await guard("billing");
  if (deny) return deny;
  const _id = billOid(params.id);
  const col = await billingCol();
  const raw = _id && (await col.findOne({ _id }));
  if (!_id || !raw) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const doc = toBill(raw);
  if (!/^\S+@\S+\.\S+$/.test(doc.client.email)) return NextResponse.json({ error: "Add the client's email address first, then save." }, { status: 400 });
  const profile = await getProfile();
  const t = computeTotals(doc, profile);
  const title = docTitle(doc.type, t.gstOn);
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const link = `${origin}/d/${doc.shareToken}`;
  const first = doc.client.name.split(" ")[0] || "there";
  const paragraphs =
    doc.type === "quote"
      ? [`Hi ${first},`, `Thank you for your interest. Please find our ${title.toLowerCase()} ${doc.number} for ${inr(t.total, 0)}, valid till ${doc.dueDate || "the date shown"}.`, "You can view and download it as a PDF from the button below. Reply to this email or call us if you have any questions.", `Team ${profile.legalName}`]
      : [`Hi ${first},`, `Please find ${title.toLowerCase()} ${doc.number} for ${inr(t.total, 0)}${doc.dueDate ? `, due on ${doc.dueDate}` : ""}.`, "You can view and download it as a PDF from the button below. Payment details are on the invoice.", `Team ${profile.legalName}`];
  const ok = await emailPerson(doc.client.email, `${title} ${doc.number} from ${profile.legalName}`, `${title} ${doc.number}`, paragraphs, { label: `View ${title.toLowerCase()}`, url: link });
  if (!ok) return NextResponse.json({ error: "The email couldn't be sent. Check Admin → API keys → Email alerts." }, { status: 502 });
  await logActivity(await getSession(), "Invoices", `Emailed ${title.toLowerCase()} ${doc.number} to ${doc.client.email}`, doc.client.company || doc.client.name, req);
  if (doc.type === "quote" && doc.status === "draft") await col.updateOne({ _id }, { $set: { status: "sent", updatedAt: new Date().toISOString() } });
  return NextResponse.json({ ok: true, message: `Sent to ${doc.client.email}` });
}
