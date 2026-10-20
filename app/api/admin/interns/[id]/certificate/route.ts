import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { internsCol, oid, toIntern } from "@/lib/intern-db";
import { mailCertificate } from "@/lib/intern-mail";

// Issues a certificate number once (SPX-YYYY-0001, counting up within each year). Calling again keeps the same number.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("people");
  if (deny) return deny;
  const _id = oid(params.id);
  const col = await internsCol();
  const intern = _id ? await col.findOne({ _id }) : null;
  if (!_id || !intern) return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  if (!intern.name) return NextResponse.json({ error: "Add the intern's name before issuing a certificate." }, { status: 400 });
  // Already issued: return it. A "PENDING-…" value is a claim in progress (handled below) and is never returned.
  const isPending = (v: unknown) => typeof v === "string" && v.startsWith("PENDING-");
  if (intern.certId && !isPending(intern.certId)) return NextResponse.json(toIntern(intern));

  // Claim the intern first, so two clicks at the same time can't issue two numbers.
  const claim = `PENDING-${randomUUID()}-${Date.now()}`; // ends with the claim time
  // A claim older than a minute was left by a crashed request; it may be taken over.
  const staleBefore = Date.now() - 60_000;
  const existing = await col.findOne({ _id });
  const stale = typeof existing?.certId === "string" && existing.certId.startsWith("PENDING-") && Number(existing.certId.split("-").pop()) < staleBefore;
  const claimed = await col.findOneAndUpdate(
    stale ? { _id, certId: existing!.certId } : { _id, certId: { $in: ["", null] } },
    { $set: { certId: claim } },
    { returnDocument: "after" },
  );
  if (!claimed) {
    // Already issued, or being issued by another click right now: never show the temporary value.
    const doc = await col.findOne({ _id });
    if (!doc) return NextResponse.json({ error: "Intern not found." }, { status: 404 });
    const current = toIntern(doc);
    if (!current.certId || isPending(current.certId)) return NextResponse.json({ error: "The certificate is being issued. Refresh in a moment." }, { status: 409 });
    return NextResponse.json(current);
  }

  let updated;
  try {
    // A separate counter per year, so numbers start again at 0001 every January.
    // India time, so a certificate issued just after midnight IST on 1 January gets the new year and date.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const year = Number(today.slice(0, 4));
    const counters = (await getDb()).collection<{ _id: string; seq: number }>("counters");
    // Never go below numbers already issued this year (e.g. by the older single counter).
    const issuedThisYear = await col.find({ certId: { $regex: `^SPX-${year}-\\d+$` } }, { projection: { certId: 1 } }).toArray();
    const highest = Math.max(0, ...issuedThisYear.map((d) => Number(String(d.certId).split("-")[2]) || 0));
    // Two first-of-the-year upserts at once can hit a duplicate-key error (11000); the retry then updates the existing doc.
    const retryDup = async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        if ((e as { code?: number })?.code === 11000) return fn();
        throw e;
      }
    };
    await retryDup(() => counters.updateOne({ _id: `certificate-${year}` }, { $max: { seq: highest } }, { upsert: true }));
    const counter = (await retryDup(() =>
      counters.findOneAndUpdate({ _id: `certificate-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" }),
    )) as { seq?: number } | null;
    const seq = counter?.seq ?? 1;
    const certId = `SPX-${year}-${String(seq).padStart(4, "0")}`;
    updated = await col.findOneAndUpdate(
      { _id, certId: claim },
      { $set: { certId, issuedOn: today, status: "completed", endDate: intern.endDate || today } },
      { returnDocument: "after" },
    );
  } catch (e) {
    await col.updateOne({ _id, certId: claim }, { $set: { certId: "" } }).catch(() => undefined); // release the claim
    throw e;
  }
  const after = updated ?? (await col.findOne({ _id }));
  if (!after) return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  // Our claim was taken over (stale) by another request: never return a temporary value.
  if (!after.certId || isPending(after.certId)) return NextResponse.json({ error: "The certificate is being issued. Refresh in a moment." }, { status: 409 });
  const issued = toIntern(after);
  const notify = !!(await jsonBody(req)).notify;
  const emailed = notify ? await mailCertificate(issued) : false;
  return NextResponse.json({ ...issued, emailed });
}
