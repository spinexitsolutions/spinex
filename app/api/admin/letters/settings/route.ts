import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { LETTER_TEMPLATES } from "@/lib/letters";
import { getLetterSettings, saveLetterSettings } from "@/lib/letter-db";

export async function GET() {
  const deny = await guard("people", "view");
  if (deny) return deny;
  return NextResponse.json(await getLetterSettings());
}

// { type, subject, body } saves that wording as the default for new letters of the type.
// { type, reset: true } goes back to the built-in wording. { prefix } changes the reference number prefix.
export async function PUT(req: Request) {
  const deny = await guard("people");
  if (deny) return deny;
  const b = await jsonBody(req);
  const settings = await getLetterSettings();
  if (b.prefix !== undefined) {
    const p = String(b.prefix).replace(/[^A-Za-z0-9-]/g, "").slice(0, 12);
    if (!p) return NextResponse.json({ error: "Use letters or numbers, e.g. SPX." }, { status: 400 });
    settings.prefix = p;
  }
  const type = String(b.type ?? "");
  if (type) {
    if (!LETTER_TEMPLATES[type]) return NextResponse.json({ error: "Unknown letter type." }, { status: 400 });
    if (b.reset) delete settings.wording[type];
    else settings.wording[type] = { subject: String(b.subject ?? "").trim().slice(0, 200), body: String(b.body ?? "").slice(0, 20000) };
  }
  await saveLetterSettings(settings);
  await logActivity(await getSession(), "Letters", type ? `${b.reset ? "Reset" : "Saved"} default wording for ${LETTER_TEMPLATES[type].label.toLowerCase()}` : `Changed letter number prefix to ${settings.prefix}`, "", req);
  return NextResponse.json(settings);
}
