import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { guard } from "@/lib/admin-guard";
import { readBackup, restoreBackup } from "@/lib/automation";

export const maxDuration = 60;

const MAX = 25 * 1024 * 1024;

// Owner only. mode=inspect: shows what's inside a backup file. mode=restore: puts the chosen parts back
// (a safety copy of the current data is saved first). Team logins and API keys are never replaced.
export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Choose a backup file." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "This file is larger than 25 MB." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const mode = String(form?.get("mode") ?? "inspect");

  try {
    if (mode === "inspect") {
      const b = readBackup(buf);
      return NextResponse.json({ createdAt: b.createdAt, collections: Object.entries(b.collections).map(([name, docs]) => ({ name, count: docs.length })) });
    }
    if (String(form?.get("confirm") ?? "").trim().toUpperCase() !== "RESTORE") {
      return NextResponse.json({ error: "Type RESTORE to confirm." }, { status: 400 });
    }
    let only: string[] = [];
    try {
      only = JSON.parse(String(form?.get("collections") ?? "[]"));
    } catch {
      only = [];
    }
    const r = await restoreBackup(buf, Array.isArray(only) ? only.map(String) : []);
    revalidateTag("content");
    revalidateTag("posts");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Restore failed." }, { status: 400 });
  }
}
