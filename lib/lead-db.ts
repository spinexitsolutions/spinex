import { type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { LEAD_EDITABLE, LEAD_STATUSES, type Lead, type LeadStatus } from "./leads";

export const leadsCol = async () => (await getDb()).collection("leads");

export function toLead(doc: WithId<Document>): Lead {
  const { _id, ...rest } = doc;
  return {
    name: "", phone: "", email: "", services: "", budget: "", message: "", plan: "", source: "contact",
    status: "new", value: "", followUp: "", followUpNote: "", assignedTo: "", assignedName: "", notes: "", createdAt: "", updatedAt: "",
    ...(rest as Partial<Lead>),
    id: String(_id),
  };
}

export function cleanLead(input: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const k of LEAD_EDITABLE) {
    if (input[k] === undefined) continue;
    let v = String(input[k] ?? "").trim().slice(0, k === "message" || k === "notes" ? 4000 : 300);
    if (k === "status" && !LEAD_STATUSES.includes(v as LeadStatus)) v = "new";
    if (k === "followUp" && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) v = "";
    if (k === "value") v = v.replace(/[^\d]/g, "");
    out[k] = v;
  }
  return out;
}
