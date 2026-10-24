import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard } from "@/lib/admin-guard";
import { templateFor } from "@/lib/letters";
import { getLetterhead, letterOid, lettersCol, toLetter } from "@/lib/letter-db";
import { emailPerson } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";

// Emails the person a link to view and download their letter. A draft is issued first.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("people");
  if (deny) return deny;
  const _id = letterOid(params.id);
  const col = await lettersCol();
  const raw = _id && (await col.findOne({ _id }));
  if (!_id || !raw) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const l = toLetter(raw);
  if (l.status === "revoked") return NextResponse.json({ error: "This letter is revoked. Restore it first if you want to send it." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(l.person.email)) return NextResponse.json({ error: "Add the person's email address first, then save." }, { status: 400 });
  if (!l.person.name.trim()) return NextResponse.json({ error: "Add the person's name first, then save." }, { status: 400 });

  const head = await getLetterhead();
  const label = templateFor(l.type).label;
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const first = l.person.name.split(/\s+/)[0] || "there";
  const ok = await emailPerson(
    l.person.email,
    `${label} from ${head.legalName}`,
    label,
    [`Hi ${first},`, `Please find your ${label.toLowerCase()} (${l.number}) from ${head.legalName}.`, "You can view it and download it as a PDF from the button below.", `Team ${head.legalName}`],
    { label: "View letter", url: `${origin}/l/${l.token}` },
  );
  if (!ok) return NextResponse.json({ error: "The email couldn't be sent. Check Admin → API keys → Email alerts." }, { status: 502 });
  const stamp = new Date().toISOString();
  const doc = await col.findOneAndUpdate({ _id }, { $set: { status: "issued", issuedAt: l.issuedAt || stamp, sentAt: stamp, updatedAt: stamp } }, { returnDocument: "after" });
  await logActivity(await getSession(), "Letters", `Emailed ${label.toLowerCase()} ${l.number} to ${l.person.email}`, l.person.name, req);
  return NextResponse.json({ ok: true, message: `Sent to ${l.person.email}`, letter: toLetter(doc!) });
}
