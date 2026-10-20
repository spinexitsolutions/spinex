// Browser helpers for the admin image upload.

export type Uploaded = { id: string; url: string; name: string; size: number; contentType: string; uploadedAt: string };

const MAX_SIDE = 2000;

// Shrinks big photos (max 2000px, WebP) before upload. Small images and GIFs are sent as they are.
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 600 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

class LoggedOut extends Error {}

// One file per request, so each stays under the host's request size limit (4.5 MB on Vercel).
async function uploadOne(file: File): Promise<Uploaded> {
  const fd = new FormData();
  fd.append("files", await compressImage(file));
  const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new LoggedOut("Please log in again.");
  }
  if (res.status === 413) throw new Error("File is too large to upload.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed. Try again.");
  const list = (Array.isArray(data) ? data : [data]) as Uploaded[];
  if (!list[0]) throw new Error("Upload failed. Try again.");
  return list[0];
}

export type UploadReport = { uploaded: Uploaded[]; failed: { name: string; error: string }[] };

// Uploads files one after another and reports which ones failed.
export async function uploadImagesEach(files: File[]): Promise<UploadReport> {
  const report: UploadReport = { uploaded: [], failed: [] };
  for (const f of files) {
    try {
      report.uploaded.push(await uploadOne(f));
    } catch (e) {
      if (e instanceof LoggedOut) throw e;
      report.failed.push({ name: f.name, error: e instanceof Error ? e.message : "Upload failed." });
    }
  }
  return report;
}

// Returns the uploaded files; throws only when none of them could be uploaded.
export async function uploadImages(files: File[]): Promise<Uploaded[]> {
  const { uploaded, failed } = await uploadImagesEach(files);
  if (!uploaded.length && failed.length) throw new Error(failed.length === 1 ? failed[0].error : `${failed.length} uploads failed: ${failed[0].error}`);
  return uploaded;
}
