import { ObjectId, type WithId, type Document } from "mongodb";
import { EDITABLE, STATUSES, blankIntern, type Intern } from "./interns";
import { getDb } from "./db";

export const internsCol = async () => (await getDb()).collection("interns");

export function toIntern(doc: WithId<Document>): Intern {
  const { _id, ...rest } = doc;
  return { ...blankIntern(), ...(rest as Partial<Intern>), id: String(_id), resumeId: rest.resumeId ? String(rest.resumeId) : "" };
}

// Keeps only known fields, trims text and caps lengths.
export function clean(input: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const k of EDITABLE) {
    if (input[k] === undefined) continue;
    let v = String(input[k] ?? "").trim().slice(0, k === "why" || k === "notes" ? 3000 : 300);
    if (k === "status" && !STATUSES.includes(v as Intern["status"])) v = "applied";
    if ((k === "startDate" || k === "endDate") && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) v = "";
    out[k] = v;
  }
  return out;
}

export const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export async function getIntern(id: string) {
  const _id = oid(id);
  if (!_id) return null;
  const doc = await (await internsCol()).findOne({ _id });
  return doc ? toIntern(doc) : null;
}
