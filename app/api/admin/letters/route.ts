import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { todayIST } from "@/lib/billing";
import { getIntern } from "@/lib/intern-db";
import { LETTER_TEMPLATES, blankPerson, defaultLayout, initialFields, salaryFromCtc, templateFor, type Letter } from "@/lib/letters";
import { getLetterSettings, letterOid, lettersCol, newLetterToken, newVerifyCode, nextLetterNumber, startingWording, toLetter } from "@/lib/letter-db";

// All letters, newest first (without the long wording). ?internId= shows one person's letters.
export async function GET(req: Request) {
  const deny = await guard("people", "view");
  if (deny) return deny;
  const internId = new URL(req.url).searchParams.get("internId");
  const docs = await (await lettersCol()).find(internId ? { internId } : {}, { projection: { body: 0 } }).sort({ createdAt: -1 }).limit(2000).toArray();
  return NextResponse.json(docs.map(toLetter));
}

// New letter: { type } blank, { type, internId } filled from an intern / applicant, or { type, fromLetter } for the same person.
export async function POST(req: Request) {
  const deny = await guard("people");
  if (deny) return deny;
  const session = await getSession();
  const b = await jsonBody(req);
  const type = String(b.type ?? "");
  if (!LETTER_TEMPLATES[type]) return NextResponse.json({ error: "Pick a letter type." }, { status: 400 });

  const settings = await getLetterSettings();
  const date = todayIST();
  const stamp = new Date().toISOString();
  let person = blankPerson();
  const fields = initialFields(type);
  let internId = "";
  const keys = new Set(templateFor(type).fields.map((x) => x.key));
  const put = (k: string, v: string) => { if (v && keys.has(k)) fields[k] = v; };

  if (b.internId) {
    const i = await getIntern(String(b.internId));
    if (!i) return NextResponse.json({ error: "That person wasn't found." }, { status: 404 });
    internId = i.id;
    person = { ...person, name: i.name, email: i.email, phone: i.phone, address: i.city };
    put("role", i.role);
    put("designation", i.role);
    put("startDate", i.startDate);
    put("endDate", i.endDate);
    put("joiningDate", i.startDate);
    put("lastDate", i.endDate);
    put("mentor", i.mentor);
    put("project", i.work);
    put("summary", i.work);
    if (i.mode) {
      const m = /remote|home/i.test(i.mode) ? "Remote (work from home)" : /hybrid/i.test(i.mode) ? "Hybrid" : /office/i.test(i.mode) ? "Work from office" : "";
      put("workMode", m);
    }
  } else if (b.fromLetter) {
    const id = letterOid(String(b.fromLetter));
    const src = id && (await (await lettersCol()).findOne({ _id: id }));
    if (src) {
      const l = toLetter(src);
      person = l.person;
      internId = l.internId;
      // Carry over the details that mean the same thing in the new letter (designation, dates …).
      for (const [k, v] of Object.entries(l.fields)) if (keys.has(k) && v && !["acceptBy", "purpose", "issue", "reason"].includes(k)) fields[k] = v;
      if (keys.has("designation") && !fields.designation && l.fields.role) fields.designation = l.fields.role;
      if (keys.has("oldDesignation") && l.fields.designation) fields.oldDesignation = l.fields.designation;
      if (keys.has("oldCtc") && l.fields.ctc) fields.oldCtc = l.fields.ctc;
    }
  }

  const wording = startingWording(type, settings);
  const doc: Omit<Letter, "id"> = {
    type,
    number: await nextLetterNumber(type, date, settings.prefix),
    verifyCode: newVerifyCode(),
    status: "draft",
    date,
    person,
    fields,
    subject: wording.subject,
    body: wording.body,
    salary: templateFor(type).salary && Number(fields.ctc) > 0 ? salaryFromCtc(Number(fields.ctc)) : [],
    signers: null,
    layout: defaultLayout(type),
    internId,
    token: newLetterToken(),
    issuedAt: "",
    sentAt: "",
    createdBy: session?.name ?? "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  const { insertedId } = await (await lettersCol()).insertOne(doc);
  await logActivity(session, "Letters", `Started ${templateFor(type).label.toLowerCase()} ${doc.number}`, person.name, req);
  return NextResponse.json({ ...doc, id: String(insertedId) }, { status: 201 });
}
