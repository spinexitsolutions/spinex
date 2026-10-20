import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { guard } from "@/lib/admin-guard";
import { IMAGE_TYPES, MAX_IMAGE, fileUrl, uploadsBucket, type UploadInfo } from "@/lib/uploads-server";
import { optimizeImage } from "@/lib/image-optimize";

// List uploaded images, newest first.
export async function GET() {
  // Content editors, and HR for certificate signature images.
  const deny = (await guard("media", "view")) && (await guard("content")) && (await guard("blog")) && (await guard("people")) && (await guard("billingDetails"));
  if (deny) return deny;
  const files = await (await uploadsBucket()).find({}, { sort: { uploadDate: -1 }, limit: 1000 }).toArray();
  const out: UploadInfo[] = files.map((f) => ({
    id: String(f._id),
    url: fileUrl(f._id),
    name: f.filename,
    size: f.length,
    contentType: String(f.metadata?.contentType ?? ""),
    uploadedAt: f.uploadDate.toISOString(),
  }));
  return NextResponse.json(out);
}

// Upload one or more images (field name "files").
export async function POST(req: Request) {
  // Content editors, and HR for certificate signature images.
  const deny = (await guard("media")) && (await guard("content")) && (await guard("blog")) && (await guard("people")) && (await guard("billingDetails"));
  if (deny) return deny;
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => typeof f !== "string");
  if (!files.length) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });

  // Check every file first, so one bad file doesn't leave the others half-uploaded.
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) return NextResponse.json({ error: `${file.name || "This file"} isn't a supported image. Use JPG, PNG, WebP or GIF.` }, { status: 400 });
    if (file.size > MAX_IMAGE) return NextResponse.json({ error: `${file.name || "This image"} is larger than 4 MB.` }, { status: 400 });
  }

  const bucket = await uploadsBucket();
  const saved: UploadInfo[] = [];
  for (const file of files) {
    // Photos are resized and saved as WebP so they load fast on phones.
    const img = await optimizeImage(Buffer.from(await file.arrayBuffer()), file.type, (file.name || "image").slice(0, 120));
    const id = await new Promise<ObjectId>((resolve, reject) => {
      const up = bucket.openUploadStream(img.name, { metadata: { contentType: img.type, ...(img.changed ? { originalSize: file.size } : {}) } });
      up.on("error", reject).on("finish", () => resolve(up.id as ObjectId));
      up.end(img.buf);
    });
    saved.push({ id: String(id), url: fileUrl(id), name: img.name, size: img.buf.length, contentType: img.type, uploadedAt: new Date().toISOString() });
  }
  return NextResponse.json(saved, { status: 201 });
}
