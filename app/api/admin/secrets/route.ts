import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { saveSecrets, secretsView } from "@/lib/secrets";

// Admin → API keys. Owner only (same permission as Team and roles). Values are never sent back,
// only whether each key is set and its last 4 characters.
export async function GET() {
  const deny = await guard("users");
  if (deny) return deny;
  return NextResponse.json(await secretsView());
}

export async function PUT(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const body = (await jsonBody(req)) as { keys?: Record<string, unknown>; custom?: Record<string, unknown>; headCode?: unknown };
  const clean = (o?: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v === null || typeof v === "string").map(([k, v]) => [k, v as string | null]));
  try {
    await saveSecrets(clean(body.keys), clean(body.custom), typeof body.headCode === "string" ? body.headCode : undefined);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save." }, { status: 400 });
  }
  // Pages read the Turnstile site key and custom head code when they are built, so rebuild them now.
  const names = [...Object.keys(body.keys ?? {}), ...Object.keys(body.custom ?? {}), ...(typeof body.headCode === "string" ? ["Custom code"] : [])];
  await logActivity(await getSession(), "API keys", `Saved ${names.length ? names.join(", ") : "API keys"}`, "", req);
  revalidatePath("/", "layout");
  revalidateTag("content");
  return NextResponse.json(await secretsView());
}
