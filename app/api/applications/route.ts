import { NextResponse } from "next/server";
import { GridFSBucket, type ObjectId } from "mongodb";
import { getDb, hasDb } from "@/lib/db";
import { clean, internsCol } from "@/lib/intern-db";
import { notifyAdmin } from "@/lib/notify";
import { checkHuman } from "@/lib/antispam";
import { safeUrl } from "@/lib/content-sanitize";

const MAX_PDF = 3 * 1024 * 1024;
const APPLICANT_FIELDS = ["name", "email", "phone", "city", "college", "role", "mode", "duration", "experience", "link", "why"] as const;

// Public endpoint for the internship form. Saves the application (and resume PDF) to the database.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Applications are offline right now. Please apply on WhatsApp instead." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Couldn't read the form. Please try again." }, { status: 400 });
  const human = await checkHuman(req, { website: form.get("website"), startedAt: form.get("startedAt"), cfToken: form.get("cfToken") }, "apply", 5);
  if (!human.ok) return human.silent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: human.error }, { status: human.status });

  // Only fields an applicant fills in. Status, notes, mentor, dates, certificate etc. are set by the team in the admin panel.
  const data = clean(Object.fromEntries([...form.entries()].filter(([k, v]) => typeof v === "string" && (APPLICANT_FIELDS as readonly string[]).includes(k))));
  data.link = safeUrl(data.link);
  const errors: Record<string, string> = {};
  if (!data.name) errors.name = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) errors.email = "Enter a valid email, like name@gmail.com.";
  if ((data.phone ?? "").replace(/\D/g, "").length < 10) errors.phone = "Enter a 10-digit phone number.";
  if (!data.role) errors.role = "Choose the role you want to apply for.";

  const raw = form.get("resume");
  const file = raw && typeof raw === "object" && "arrayBuffer" in raw ? (raw as Blob & { name?: string }) : null;
  const hasFile = !!file && file.size > 0;
  if (file && hasFile && file.type !== "application/pdf") errors.resume = "Upload your resume as a PDF.";
  if (file && hasFile && file.size > MAX_PDF) errors.resume = "Resume must be under 3 MB.";
  // The browser's file type can be faked, so also check the file really is a PDF.
  const buf = file && hasFile && !errors.resume ? Buffer.from(await file.arrayBuffer()) : null;
  if (buf && buf.subarray(0, 5).toString("latin1") !== "%PDF-") errors.resume = "Upload your resume as a PDF.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please fix the highlighted fields.", errors }, { status: 400 });

  let resumeId: ObjectId | null = null;
  let resumeName = "";
  if (file && buf) {
    const bucket = new GridFSBucket(await getDb(), { bucketName: "resumes" });
    resumeName = (file.name || "resume.pdf").slice(0, 120);
    resumeId = await new Promise<ObjectId>((resolve, reject) => {
      const up = bucket.openUploadStream(resumeName, { metadata: { contentType: "application/pdf" } });
      up.on("error", reject).on("finish", () => resolve(up.id as ObjectId));
      up.end(buf);
    });
  }

  await (await internsCol()).insertOne({
    ...data,
    status: "applied",
    kind: String(form.get("kind")) === "job" ? "job" : "internship",
    source: String(form.get("kind")) === "job" ? "careers" : "website",
    resumeId: resumeId ? String(resumeId) : "",
    resumeName,
    certId: "",
    issuedOn: "",
    createdAt: new Date().toISOString(),
  });
  await notifyAdmin(
    `New ${String(form.get("kind")) === "job" ? "job" : "internship"} application: ${data.role} - ${data.name}`,
    [
      ["Name", data.name],
      ["Role", data.role],
      ["Phone", data.phone],
      ["Email", data.email],
      ["College", data.college ?? ""],
      ["City", data.city ?? ""],
      ["Resume", resumeName ? "Attached (open it in the admin panel)" : ""],
    ],
    `${new URL(req.url).origin}/admin`,
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
