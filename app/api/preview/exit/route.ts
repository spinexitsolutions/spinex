import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

// "Exit preview" works even after the admin login has expired, so the preview bar can always be closed.
export async function POST() {
  draftMode().disable();
  return NextResponse.json({ ok: true });
}
